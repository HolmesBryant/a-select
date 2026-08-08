/**
 * A custom element that renders a select element with support for images
 * @file /src/a-select.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

import styles from './a-select-shadow.css' with {type: 'css'};

const abindUpdate = Symbol.for('abind.update');

/**
 * A custom element that renders a select element with support for images
 * @extends HTMLElement
 * @implements FormAssociatedElement
 */
export default class ASelect extends HTMLElement {

  // --- Attributes ---

  /**
   * Whether the option picker is visible
   * @private
   * @type {boolean}
   */
  #active = false;

  /**
   * Whether the element is focused on page load
   * @private
   * @type {boolean}
   */
  #autofocus = false;

  /**
   * Whether the submitted form data if formatted like a normal select[multiple] element
   * @private
   * @type {boolean}
   */
  #convertMulti = false;

  /**
   * Whether the element is disabled
   * @private
   * @type {boolean}
   */
  #disabled = false;

  /**
   * The name of the element (for form submission)
   * @private
   * @type {boolean}
   */
  #name;

  /**
   * The id of the form element to associate with
   * @private
   * @type {string | undefined}
   */
  #form;

  /**
   * Whether the element behaves like a select[multiple] element
   * @private
   * @type {boolean}
   */
  #multiple = false;

  /**
   * Whether a value is required
   * @private
   * @type {boolean}
   */
  #required = false;

  /**
   * How many options are visible on page load.
   * Default is 0 for select single and 4 for select multiple.
   * @private
   * @type {number}
   */
  #size = 0;

  /**
   * The value(s) sent when the associated form is submitted
   * @private
   * @type {string | array}
   */
  #value = [];

  // --- Private Properties ---

  /**
   * AbortController used by all event listeners
   * @private
   * @type {AbortController}
   */
  #abortController;

  /**
   * Controller for form reset events
   * @private
   * @type {AbortController | null}
   */
  #resetController;

  /**
   * Controller for form submit events (used in convert-multi mode)
   * @private
   * @type {AbortController | null}
   */
  #submitController;

  /**
   * Whether connectedCallback() has run
   * @private
   * @type {boolean}
   */
  #connected = false;

  /**
   * Track focus index for keyboard navigation
   * @private
   * @type {number}
   */
  #idx = -1;

  /**
   * Array of DOM elements representing options (populated dynamically)
   * @private
   * @type {HTMLElement[]}
   */
  #items = [];

  /**
   * Container for the option list (picker) within shadow DOM
   * @private
   * @type {HTMLElement}
   */
  #optionContainer;

  /**
   * Reference to the internal <select> element within shadow DOM
   * @private
   * @type {HTMLSelectElement}
   */
  #select;

  /**
   * Reference to the slot element in shadow DOM
   * @private
   * @type {HTMLSlotElement}
   */
  #slot;

  /**
   * Array of values from the internal <select> options
   * @private
   * @type {string[]}
   */
  #values;

  // --- Static Properties

  /**
   * Indicates this element is form-associated.
   * @static
   * @type {boolean}
   */
  static formAssociated = true;

  /**
   * List of attributes that trigger attributeChangedCallback updates.
   * @static
   * @type {string[]}
   */
  static observedAttributes = [
    'active',
    'autofocus',
    'convert-multi',
    'disabled',
    'form',
    'name',
    'multiple',
    'required',
    'size',
    'value'
  ];

  /**
   * Shadow DOM template for the component structure.
   * @static
   * @type {HTMLTemplateElement}
   */
  static template = document.createElement('template');
  static {
    this.template.innerHTML = `
      <div id="wrapper" part="wrapper">
        <select id="select" part="select"></select>
        <div id="options" part="options"></div>
      </div>

      <slot hidden id="slot"></slot>
    `;
  }

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.name = this.name;
    this._internals.setFormValue(this.value);
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.shadowRoot.append(ASelect.template.content.cloneNode(true));
    this.#select = this.shadowRoot.getElementById('select');
    this.#slot = this.shadowRoot.getElementById('slot');
    this.#optionContainer = this.shadowRoot.getElementById('options');
  }

  // --- Lifecycle Methods ---

  /**
   * Called when an attribute's value changes.
   * Handles updating internal state and triggering re-renders or side effects based on the changed attribute.
   * @param {string} attr - The name of the changed attribute.
   * @param {string | null} oldval - The previous value of the attribute (null if not set before).
   * @param {string | null} newval - The new value of the attribute.
   */
  attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;
    switch (attr) {
      case 'active':
        this.#active = this.hasAttribute('active');
        this.#showPicker(this.#active);
        break;

      case 'autofocus':
        this.#autofocus = this.hasAttribute('autofocus');
        this.#select.toggleAttribute('autofocus', this.#autofocus);
        if (this.#autofocus && this.#multiple) {
          this.#optionContainer.tabIndex = 0;
          this.#optionContainer.focus();
        } else if (!this.#autofocus && this.#multiple) {
          this.#optionContainer.removeAttribute('tab-index');
        } else if (this.#autofocus) {
          this.#select.focus();
        } else {
          this.#select.blur();
        }
        break;

      case 'convert-multi':
        this.#convertMulti = this.hasAttribute('convert-multi');
        if (this.#connected) {
          if (this.#convertMulti) {
            this.#addSubmitListener();
          } else {
            this.#submitController.abort();
            this.#submitController = null;
            this.#setValue();
          }
        }
        break;

      case 'disabled':
        this.#disabled = this.hasAttribute('disabled');
        this.#select.disabled = this.#disabled;
        break;

      case 'name':
        this.#name = newval;
        this._internals.name = newval;
        break;

      case 'form':
        const form = document.getElementById(newval) || this.closest('form');
        if (!form || !(form instanceof HTMLFormElement)) {
          console.error(`a-select.form - no form parent or form with id "${newval}" was found.`, this);
          return;
        }

        this.#form = newval;
        this.#select.setAttribute('form', newval);
        this.#addResetListener();
        if (this.#connected && this.#convertMulti) {
          this.#addSubmitListener();
        }
        break;

      case 'multiple':
        this.#multiple = this.hasAttribute('multiple');
        this.#optionContainer.toggleAttribute('data-multiple', this.#multiple);
        this.#select.multiple = this.#multiple;

        if (!this.#connected) return;
        if (this.#multiple) {
          this.#select.tabIndex = "-1";
          this.active = true;
        } else {
          this.active = false;
        }
        break;

      case 'required':
        this.#required = this.hasAttribute('required');
        this.#select.required = this.#required;
        this.#setValidity(this.#getInvalidStates());
        break;

      case 'size':
        if (newval === null) return;
        const s = parseInt(newval);
        if (isNaN(s)) {
          console.error(`a-select.size must be a number; value given was ${newval}`, this);
        } else {
          this.#size = s;
          this.#select.size = s;
          if (this.#connected) this.#setSize();
        }
        break;

      case 'value':
        if (newval === 'null') {
          newval = null;
        } else {
          newval = newval.split(',').map( v => v.trim() );
        }

        this.#value = newval;
        if (this.#connected) {
          this.#setSelected(this.#value);
          this.#setValue();
        }
        break;
    }

    if (attr === 'convert-multi') {
      globalThis[abindUpdate]?.(this, 'convertMulti', this[attr]);
    } else {
      globalThis[abindUpdate]?.(this, attr, this[attr]);
    }
  }

  /**
   * Called when the element is added to the DOM.
   * Initializes abort controllers, sets default names if missing, adds event listeners, and shows picker if active.
   */
  connectedCallback() {
    this.#abortController = new AbortController();
    if (!this.#name) this.name = 'a-select_' + Math.random().toString(36).slice(2, 8);
    if (this.#multiple) {
      this.#select.tabIndex = "-1";
      this.active = true;
    }

    this.#addListeners();
    if (this.#convertMulti) this.#addSubmitListener();
    if (this.#active) this.#showPicker();

    this.#connected = true;
  }

  /**
   * Called when the element is removed from the DOM or disconnected.
   * Cleans up all abort controllers associated with event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }

    if (this.#submitController) {
      this.#submitController.abort();
      this.#submitController = null;
    }

    if (this.#resetController) {
      this.#resetController.abort();
      this.#resetController = null;
    }
  }

  // --- Private Methods ---

  /**
   * Adds various event listeners for interaction, keyboard navigation, and form submission.
   * Uses an AbortController signal to ensure cleanup on disconnection.
   * @private
   */
  #addListeners() {
    const signal = this.#abortController.signal;

    this.#slot.addEventListener('slotchange', () => {
      if (this.children.length === 0) return;
      this.#populateSelect();
      this.#setSelected(this.#value, false);
    }, { signal: signal });

    this.#select.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (this.#disabled) return;
      this.#select.focus();
      this.active = !this.#active;
    }, { signal: signal });

    this.#select.addEventListener('change', event => {
      this.#setValue();
    });

    this.#optionContainer.addEventListener('pointerdown', event => {
      if (this.#disabled) return;
      const option = event.target.closest('div');
      if (option.hasAttribute('disabled')) return;
      if (option.dataset.type == "optgroup") return;

      this.#setSelected(option.dataset.value);
      this.#setValue();
      if (this.#multiple) return;
      this.active = false;
    }, { signal:this.#abortController.signal });

    this.#optionContainer.addEventListener('keydown', event => {
      if (this.#disabled) return;
      this.#handleKeyPress(event);
    }, { signal:this.#abortController.signal });

    if (!this.#multiple) {
      this.#select.addEventListener('keydown', event => {
        this.#handleKeyPress(event);
      }, { signal: this.#abortController.signal });
    }

    window.addEventListener('pointerdown', event => {

      if (event.target.closest('a-select')) return;
        if (this.#multiple || !this.#active) return;
      setTimeout( () => {
        if (this.#multiple) return;
        if (this.#active) this.active = false;
      }, 100);
    }, { signal: this.#abortController.signal });
  }

  /**
   * Sets up a listener for the 'reset' event on the associated form element.
   * Resets the selection when the form is reset.
   * @private
   */
  #addResetListener() {
    if (this.#resetController) {
      this.#resetController.abort();
      this.#resetController = null;
    }

    this.#resetController = new AbortController();
    this._internals.form.addEventListener('reset', event => {
      this.#setSelected(this.getAttribute('value'));
      this.#setValue(this.getAttribute('value'));
    }, { signal: this.#resetController.signal });
  }

  /**
   * Sets up a listener for the 'submit' event on the associated form element (if in convert-multi mode).
   * Converts multiple selections into hidden inputs before submission.
   * @private
   */
  #addSubmitListener() {
    if (this.#submitController) {
      this.#submitController.abort();
      this.#submitController = null;
    }

    this.#submitController = new AbortController();
    this._internals.form.addEventListener('submit', event => {
      if (this.#form !== event.target.id) return;
      this.#convertMultiValue(event);
    }, { signal: this.#submitController.signal });
  }

  /**
   * Handles the actual conversion of multi-select values to hidden inputs during form submit.
   * Prevents default submission, replaces value with hidden inputs, then re-enables input after a timeout.
   * @private
   * @param {Event} event - The submit event.
   */
  #convertMultiValue(event) {
    event.preventDefault();
    const input = this._internals.form[this.#name];
    if (!input) {
      console.error(`a-select is not associated with the form "${this._internals.form.id}"`);
      this._internals.form.requestSubmit();
      return;
    }

    const hidden = document.createElement('input');
    const hiddenElems = [];
    this._internals.setFormValue('');
    input.disabled = true;
    hidden.type = 'hidden';
    hidden.name = this.#name;
    this.#value.forEach( val => {
      const hidden_ = hidden.cloneNode('true');
      hidden_.value = val;
      hiddenElems.push(hidden_);
      this._internals.form.append(hidden_);
    });

    this._internals.form.requestSubmit();

    setTimeout( () => {
      input.disabled = false;
      hiddenElems.forEach( elem => {
        elem.remove();
      });
    });
  }

  /**
   * Removes 'aria-selected' attribute from all options except the specified one.
   * @private
   * @param {HTMLElement | null} selected - The option element that should remain selected.
   */
  #deselectOthers(selected) {
    Array.from(this.#optionContainer.children).map( item => {
      if (item.dataset.type === 'optgroup') {
        Array.from(item.children).map(subItem => {
          if (subItem !== selected) subItem.removeAttribute('aria-selected');
        });
      } else {
        if (item !== selected) item.removeAttribute('aria-selected');
      }
    });
  }

  /**
   * Collects validity state flags (e.g., badInput, valueMissing) from the internal select element.
   * @private
   * @returns {Object<string, boolean>} An object mapping error names to their validity states.
   */
  #getInvalidStates() {
    const results = {};
    const errNames = [
      'badInput',
      'customError',
      'patternMismatch',
      'rangeOverflow',
      'rangeUnderflow',
      'stepMismatch',
      'tooLong',
      'tooShort',
      'typeMismatch',
      'valueMissing'
    ]

    errNames.forEach( name => {
      if (this.#select.validity[name]) results[name] = this.#select.validity[name];
    });

    return results;
  }

  /**
   * Handles keyboard events for navigation and selection within the picker or native select.
   * Supports ArrowUp/ArrowDown for movement and Enter/Space for selection.
   * @private
   * @param {KeyboardEvent} event - The keydown event.
   */
  #handleKeyPress(event) {
    const items = (this.#multiple) ? this.#optionContainer.children : this.#select.children;
    const item = items[this.#idx];
    const value = item?.dataset.value || item?.value;

    if (event.key === 'ArrowDown') {
      this.#moveFocus(1);
    } else if (event.key === 'ArrowUp') {
      this.#moveFocus(-1);
    } else if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      // this.#setSelected(value, item);
      this.#setSelected(value);
      this.#setValue();
    }
  }

  /**
   * Focuses a specific option item by index within the picker container.
   * Also blurs other items to maintain focus state.
   * @private
   * @param {number} i - The zero-based index of the item to highlight/focus.
   */
  #highlight(i) {
    const items = Array.from(this.#optionContainer.children);
    items.forEach((item, idx) => {
      if (idx === i) {
        item.focus();
      } else {
        item.blur()
      }
    });
  }

  /**
   * Adjusts the current focused index in the list by an offset (for arrow key navigation).
   * Wraps around using modulo arithmetic.
   * @private
   * @param {number} offset - The amount to move the focus index (+/-).
   */
  #moveFocus(offset) {
    this.#idx = (this.#idx + offset + this.#items.length) % this.#items.length;
    this.#highlight(this.#idx);
  }

  /**
   * Populates the internal <select> element with children from the slot or option container.
   * Updates selection based on current value attribute and triggers validity checks.
   * @private
   */
  #populateSelect() {
    this.#select.innerHTML = "";
    // on first run, get items from this.children.
    // but when disconnected/reconnected, this.children is empty so get items from this.#optionContainer.children
    this.#items = Array.from(this.children) || Array.from(this.#optionContainer.children);
    this.#items.forEach( item => {
      if (!item instanceof HTMLOptionElement || !item instanceof HTMLOptGroupElement) {
        console.error(`a-select: Skipping option. Option items must be either "option" or "optgroup". This item is a ${item.localName}`, this);
      } else {
        if (this.#value.includes(item.value)) item.selected = true;
        this.#select.append(item);
      }
    });

    this.#values = [...this.#select.options].map(option => option.value);
    this.#setValue();
    this.#setValidity(this.#getInvalidStates());
    this.#setOptions();
  }

  /**
   * Rebuilds the DOM structure of the option picker (divs) to match the options in the internal select.
   * Applies tabindex for multiple mode and calculates height if size is set.
   * @private
   */
  #setOptions() {
    const div = document.createElement('div');
    this.#optionContainer.innerHTML = "";

    this.#items.forEach( item => {
      let label;
      const div_a = div.cloneNode();

      if (item instanceof HTMLOptionElement) {
        div_a.innerHTML = item.innerHTML;
        div_a.dataset.value = item.value;
      } else if (item instanceof HTMLOptGroupElement) {

        // optgroup element
        div_a.dataset.type = 'optgroup';
        if (item.hasAttribute('label')) {
          label = document.createElement('strong');
          label.textContent = item.getAttribute('label');
          div_a.append(label);
        }

        for (const opt of item.children) {
          if (opt instanceof HTMLOptionElement) {
            const div_b = div.cloneNode();
            div_b.innerHTML = opt.innerHTML;
            div_b.dataset.value = opt.value;

            for (const attr of opt.attributes) {
              div_b.setAttribute(attr.name, attr.value);
            }

            div_a.append(div_b);
          } else if (label) {
            label.prepend(opt.cloneNode());
          }
        }
      }

      for (const attr of item.attributes) {
        div_a.setAttribute(attr.name, attr.value);
      }
      if (this.#multiple) div_a.tabIndex = 0;
      this.#optionContainer.append(div_a);
    });

    this.#setSize();
  }

  /**
   * Updates the selection state of both the internal <select> and the visible option container divs.
   * Handles single/multiple logic, toggling aria-selected attributes, and deselecting others in single mode.
   * @private
   * @param {string | string[]} value - The value(s) to select. Can be a string or array of strings.
   * @param {boolean} [toggle=true] - If true     (for multiple mode), false otherwise.
   */
  #setSelected(value, toggle = true) {
    if (value === null) {
      this.#deselectOthers(null);
      this.#select.value = "";
      return;
    }
    if (!Array.isArray(value)) value = [value];
    for (const idx in value) {
      const val = value[idx];
      const selected = this.#optionContainer.querySelector(`[data-value="${val}"]`);
      if (!selected) {
        console.warn(`There is no option whose value is "${val}" (case sensitive)`);
        continue;
      }

      for (const option of this.#select.options) {
        if (value.includes(option.value)) {
          if (this.#multiple) {
            if (toggle) option.selected = !option.selected;
            selected.toggleAttribute('aria-selected', option.selected);
          } else {
            option.selected = true;
            selected.toggleAttribute('aria-selected', true);
          }
          if (!this.#multiple) this.#deselectOthers(selected);
        }
      }
    }
  }

  /**
   * Adjusts the height of the option picker container based on the number of visible rows (#size).
   * Removes fixed height if size is set to 0 or null.
   * @private
   */
  #setSize() {
    if (this.#size === 0) {
      this.#optionContainer.style.removeProperty('height');
      this.removeAttribute('size');
      return;
    }
    const optElem = this.#optionContainer.children[0];
    const height = (optElem.scrollHeight + 1) * this.#size + 'px';
    this.#optionContainer.style.height = height;
  }

  /**
   * Sets validity state and message for the form-associated element using internals API.
   * @private
   * @param {Object<string, boolean>} flags - Validity state flags (e.g., badInput).
   * @param {string} [message] - Custom validation message.
   * @param {HTMLElement} [validationMessageTarget] - Element to associate the message with.
   */
  #setValidity(flags = {}) {
    this._internals.setValidity(flags, this.#select.validationMessage, this);
  }

  /**
   * Updates the internal value array from the selected options in the native <select> element.
   * Triggers external updates via abindUpdate if available and sets validity state.
   * @private
   */
  #setValue() {
    if (this.#disabled) return;
    this.#value = Array.from(this.#select.selectedOptions).map( o => o.value);
    this._internals.setFormValue(this.value);
    globalThis[abindUpdate]?.(this, 'value', this.#value);
    this.#setValidity(this.#getInvalidStates());
  }

  /**
   * Toggles the visibility of the option picker (adds/removes 'open' class).
   * @private
   * @param {boolean} [open=true] - Whether to open or close the picker.
   */
  #showPicker(open = true) {
    if (open) {
      this.#optionContainer.classList.add('open');
    } else {
      this.#optionContainer.classList.remove('open');
    }
  }

  // --- Public Methods ---

  /**
   * Adds a new option element to the select list.
   * Accepts either an HTMLElement (option/div) or a string text content.
   * Can insert before another node or at a specific index.
   * @param {HTMLElement | string} option - The option to add, or text content for a new <option>.
   * @param {HTMLElement | number} [before] - An existing element to insert before, or an index (-1 for end).
   */
  add(option, before) {
    const options = this.#optionContainer;
    try {
      if (typeof option === 'string') {
        const newOption = document.createElement('option');
        newOption.text = option;
        option = newOption;
      }

      if (before instanceof HTMLElement && options.contains(before)) {
        options.insertBefore(option, before);
      } else if (!isNaN(before) && before >= 0 && before <= options.children.length) {
        const index = Math.min(before, options.children.length - 1);
        const referenceNode = index < options.children.length ? options[index] : null;
        options.insertBefore(option, referenceNode);
      } else {
        options.appendChild(option);
      }

      this.#setOptions();
    } catch (error) {
      console.group('a-select.add()');
      console.error(error);
      console.log('Instance', this);
      console.log('Params', {option: option, before: before});
      console.groupEnd();
    }
  }

  /**
   * Checks if the select element is valid according to HTML5 constraints.
   * @returns {boolean} True if valid, false otherwise.
   */
  checkValidity() {
    return this.#select.checkValidity();
  }

  /**
   * Retrieves an option element by its zero-based index in the picker container.
   * @param {number} index - The zero-based index of the item to retrieve.
   * @returns {HTMLElement | null} The option element at the specified index, or null if out of bounds.
   */
  item(index) {
    return this.#optionContainer.children.item(index);
  }

  /**
   * Retrieves an option element by its name attribute (if present).
   * @param {string} name - The name attribute value to search for.
   * @returns {HTMLElement | null} The named option, or null if not found.
   */
  namedItem(name) {
    return this.#optionContainer.children.namedItem(name);
  }

  /**
   * Removes an option element from the picker container by its zero-based index.
   * Re-populates the internal select and updates options after removal.
   * @param {number} index - The zero-based index of the item to remove.
   * @returns {HTMLElement} The removed option element.
   */
  remove(index) {
    const item = this.#optionContainer.children[index];
    item.remove();
    this.#populateSelect();
    return item;
  }

  /**
   * Reports whether the form control is valid without throwing an exception.
   * @returns {boolean} True if valid, false otherwise.
   */
  reportValidity() {
    return this.#select.reportValidity();
  }

  /**
   * Sets a custom validation message for the element.
   * If invalid, displays the message in the browser's UI.
   * @param {string} str - The custom error message to display.
   * @returns {boolean} True if successful, false on error.
   */
  setCustomValidity(str) {
    try {
      this.#select.setCustomValidity(str);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  // --- Getters / Setters ---

  /**
   * Gets or sets whether the option picker is currently visible/active.
   * Toggles the 'active' attribute when setting.
   * @type {boolean}
   */
  get active() { return this.#active }
  set active(value) {
    value = value != null && value !== false;
    this.toggleAttribute('active', value);
  }

  /**
   * Gets or sets whether the element receives focus automatically on page load.
   * Toggles the 'autofocus' attribute when setting.
   * @type {boolean}
   */
  get autofocus() { return this.#autofocus }
  set autofocus(value) {
    value = value != null && value !== false;
    this.toggleAttribute('autofocus', value);
  }

  /**
   * Gets or sets whether the element should convert multiple selections into hidden inputs on form submit.
   * Toggles the 'convert-multi' attribute when setting.
   * @type {boolean}
   */
  get convertMulti() { return this.#convertMulti }
  set convertMulti(value) {
    value = value != null && value !== false;
    this.toggleAttribute('convert-multi', value);
  }

  /**
   * Gets or sets whether the element is disabled.
   * Toggles the 'disabled' attribute and updates internal state when setting.
   * @type {boolean}
   */
  get disabled() { return this.#disabled }
  set disabled(value) {
    value = value != null && value !== false;
    this.toggleAttribute('disabled', value);
  }

  /**
   * Gets or sets the ID of the associated form element.
   * Updates the native <select> 'form' attribute and adds reset listener when setting.
   * @type {string | undefined}
   */
  get form() { return this.#form }
  set form(value) { this.setAttribute('form', value) }

  /**
   * Gets or sets the name of the element (used in form submissions).
   * Updates both internal state and HTML 'name' attribute when setting.
   * @type {string | undefined}
   */
  get name() { return this.#name }
  set name(value) { this.setAttribute('name', value) }

  /**
   * Gets or sets whether the element behaves like a native <select multiple> element.
   * Toggles the 'multiple' attribute, updates internal state, and adjusts tabindex/active behavior when setting.
   * @type {boolean}
   */
  get multiple() { return this.#multiple }
  set multiple(value) {
    value = value != null && value !== false;
    this.toggleAttribute('multiple', value);
  }

  /**
   * Gets a reference to the native <select> element's options collection (from shadow DOM).
   * Note: This is a direct getter returning an existing property, not a setter.
   * @type {HTMLOptionsCollection}
   */
  get options() { this.#select.options }

  /**
   * Gets or sets whether the element requires a value to be selected (HTML5 required attribute).
   * Toggles the 'required' attribute and updates validity state when setting.
   * @type {boolean}
   */
  get required() { return this.#required }
  set required(value) {
    value = value != null && value !== false;
    this.toggleAttribute('required', value);
  }

  /**
   * Gets or sets how many option rows are visible at once (for multi-row pickers).
   * Validates input as a number and updates the 'size' attribute when setting.
   * @type {number}
   */
  get size() { return this.#size }
  set size(value) {
    const nan = isNaN(parseInt(value));
    if (nan) {
      console.error(`a-select.size must be a number. Value given was ${value}`, this);
      return;
    }

    this.setAttribute('size', value);
  }

  get valid() { return this._internals.validity.valid }

  /**
   * Gets or sets the current selected value(s) as an array of strings.
   * Updates the HTML 'value' attribute (comma-separated string) when setting.
   * @type {string | string[]}
   */
  get value() { return this.#value.lenght > 1 ? this.#value : this.#value[0] }
  set value(value) { this.setAttribute('value', value) }

  /**
   * Gets the current values from the internal <select> options as an array of strings.
   * Note: This is a direct getter returning an existing property, not a setter.
   * @type {string[]}
   */
  get values() { return this.#values }
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
