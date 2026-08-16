const sheet = new CSSStyleSheet();
          sheet.replaceSync(":host {\t--accent-color: dodgerblue;\t--accent-text: white;\t--background: linen;\t--optgroup-background: moccasin;\t--border-color: silver;\t--border-radius: 5px;\t--hover-brightness: .9;\t--cursor: pointer;\t--option-height: 35px;\t--pad: 3px;\t--text-color: rgb(40,40,40);\t--transition-duration: .25s;\tborder-radius: var(--border-radius);\tdisplay: inline-block;\tposition: relative;\tinterpolate-size: allow-keywords;\tvertical-align: bottom;\tz-index: 1000;}:host([disabled]) #overlay {\tdisplay: block;}:host([disabled]) div:focus {\tfilter: none;}:host([disabled]) div:focus-within {\toutline: none;}:host([size]) #options:not([data-multiple]) {\tposition: static;}:host([size]) select {\tappearance: none;\theight: 0;\tborder: none;\toverflow: hidden;\tpadding: 0;\tposition: absolute;}:host(:not([size])) #options.open {\toverflow-y: clip;}div[data-value] {\talign-items: center;\tbackground: var(--background);\tborder-bottom: 1px solid var(--border-color);\t/* box-sizing: border-box; */\tcolor: var(--text-color);\tcursor: var(--cursor);\tdisplay: flex;\tgap: .5rem;\theight: var(--option-height);\tjustify-content: flex-start;\tline-height: 1em;\tpadding: var(--pad);\twidth: 100%;}div[data-value]:last-child{ border: none; }div[data-value]:focus,div[data-value]:not([disabled]):hover {\tfilter: brightness(var(--hover-brightness));}div:focus-within {\toutline: 1px solid white;}div[data-value] *,div[data-type=\"optgroup\"] * {\theight: var(--option-height);\tmargin-bottom: 1px;}div[selected],div[aria-selected] {\tbackground: var(--accent-color);\tcolor: var(--accent-text);}div[disabled] {\tposition: relative;\tcursor: not-allowed;}div[disabled]::before {\tcontent: \"\";\tposition: absolute;\ttop: 0;\tbottom: 0;\tleft: 0;\tright: 0;\tbackground: rgba(0, 0, 0, 0.5);}div[data-type=\"optgroup\"] {\tbackground: var(--optgroup-background);\tpadding: var(--pad) 0;}div[data-type=\"optgroup\"] > strong {\talign-items: center;\tdisplay: flex;\tgap: var(--pad);\tpadding: var(--pad);\tpadding-top: 0;}div[data-type=\"optgroup\"] > div {\tmargin: 0 var(--pad);\twidth: auto;}option {\talign-items: center;\tdisplay: flex;\theight: var(--option-height);\tpadding: var(--pad);}select {\tbackground: var(--background);\tborder-color: var(--border-color);\tborder-radius: var(--border-radius);\tcolor: var(--text-color);\tcursor: var(--cursor);\theight: var(--option-height);\tpadding: var(--pad);}select:focus {\t/* border-color: lime; */}select:disabled{ cursor: not-allowed }select[multiple] {\tappearance: none;\theight: 0;\tborder: none;\toverflow: hidden;\tpadding: 0;\tposition: absolute;}svg{ fill: var(--text-color) }#options {\theight: 0px;\toverflow-x: hidden;\toverflow-y: hidden;\tpadding: 0;\ttransition: height var(--transition-duration);}#options[data-multiple], {\tborder: 1px solid var(--border-color);}#options:not([data-multiple]) {\tposition: absolute;\twidth: max-content;}#options.open {\tborder: 1px solid var(--border-color);\tborder-radius: var(--border-radius);\theight: max-content;\tmin-height: var(--option-height);\toverflow-y: auto;}#overlay {\tbackground: rgba(0, 0, 0, 0.5);\tcursor: not-allowed;\tdisplay: none;\tposition: absolute;\ttop: 0;\tbottom: 0;\tleft: 0;\tright: 0;}#wrapper {\tbackground: var(--background);\tborder-radius: var(--border-radius);\tposition: relative;\twidth: 100%;}@media (prefers-color-scheme:dark) {\t:host { --text-color: white; --background: rgb(40,40,40); --border-color: dimgray; --hover-brightness: .75; --optgroup-background: dimgray;\t}}");

/**
 * A custom element that renders a select element with support for images
 * @file /src/a-select.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */


const abindUpdate = Symbol.for('abind.update');

/**
 * A custom element that renders a select element with support for images
 * @extends HTMLElement
 * @implements FormAssociatedElement
 */
class ASelect extends HTMLElement {

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
   * AbortController used by most event listeners
   * @private
   * @type {AbortController}
   */
  #abortController;

  /**
   * Stored value of 'value' attribute. Used when form is reset.
   * @private
   * @type {string}
   */
  #originalValue;

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
   * ElementInternals instance used for form integration
   * @private
   * @type {ElementInternals}
   */
  #internals;

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
    'debug',
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
    this.#internals = this.attachInternals();
    this.#internals.name = this.name;
    this.#internals.setFormValue(this.value);
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.adoptedStyleSheets = [sheet];
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
        if (!this.#connected) return;

        if (this.#convertMulti) {
          this.#addSubmitListener();
        } else {
          if (this.#submitController) {
            this.#submitController.abort();
            this.#submitController = null;
          }
        }
        break;

      case 'debug':
        this.debug = this.hasAttribute('debug');
        break;
      case 'disabled':
        this.#disabled = this.hasAttribute('disabled');
        this.#select.disabled = this.#disabled;
        break;

      case 'name':
        this.#name = newval;
        this.#internals.name = newval;
        break;

      case 'form':
        if (newval === 'null' || newval === null) {
          newval = this.closest('form')?.id;
        }

        this.#form = newval;

        if (newval && !document.getElementById(newval)) {
          console.error(`a-select.form: Cannot find form with id "${newval}".`);
          break;
        }

        this.#select.setAttribute('form', newval);

        if (!newval) break;

        setTimeout(() => {
          if (this.#connected) {
            this.#addResetListener();
            if (this.#convertMulti) {
              this.#addSubmitListener();
            }
          }
        }, 100);
        break;

      case 'multiple':
        this.#multiple = this.hasAttribute('multiple');
        this.#optionContainer.toggleAttribute('data-multiple', this.#multiple);
        this.#select.multiple = this.#multiple;

        if (!this.#connected) return;
        if (this.#multiple) {
          this.#select.tabIndex = "-1";
          this.#setSelected(this.#value);
          this.active = true;
        } else {
          this.active = false;
          this.#setSelected(this.#value[0]);
          this.#setValue(this.#value[0]);
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
        if (newval === 'null' || newval === null) {
          newval = null;
        } else if (!this.#multiple && this.required && newval == '') {
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
    const rando = 'a-select_' + Math.random().toString(36).slice(2, 8);

    if (this.#value) this.#originalValue = this.#value;
    if (!this.#name) this.name = rando;

    if (!this.#form) {
      const form = this.#internals.form;
      if (form && !form.id) form.id = rando;
      this.#form = form?.id;
    }

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
      this.#populateSelect(false);
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
      if (event.composedPath().includes(this)) return;
      if (this.#multiple || !this.#active) return;
      setTimeout(() => {
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
    if (!this.#form) {
      console.error("a-select.addResetListener: this.form is null. Aborting operation.");
      if (this.debug) console.trace(this.#form);
      return;
    }

    if (!document.getElementById(this.#form)) {
      console.error(`a-select.addResetListener: Cannot find form with id ${this.#form}. Aborting operation.`);
      if (this.debug) console.trace(this.#form);
      return;
    }

    if (!this.#internals.form) {
      console.error(`a-select.addResetListener: A form with id ${this.#form} was found but ElementInternals.form is null. Aborting operation.`);
      if (this.debug) console.trace(this.#form);
      return;
    }

    if (this.#resetController) {
      this.#resetController.abort();
      this.#resetController = null;
    }

    this.#resetController = new AbortController();
    this.#internals.form.addEventListener('reset', event => {
      this.#setSelected(this.#originalValue);
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

    try {
      this.#internals.form.addEventListener('submit', event => {
        if (this.#form !== event.target.id) return;
        this.#convertMultiValue(event);
      }, { signal: this.#submitController.signal });
    } catch (error) {
      throw new Error("a-select: When using convert-multi (convertMulti) a-select must either be a child of a form or have a form (id) assigned via the `form` attribute.", {reason: error});
    }
  }

  /**
   * Handles the actual conversion of multi-select values to hidden inputs during form submit.
   * Prevents default submission, replaces value with hidden inputs, then re-enables input after a timeout.
   * @private
   * @param {Event} event - The submit event.
   */
  #convertMultiValue(event) {
    event.preventDefault();
    const input = this.#internals.form[this.#name];
    if (!input) {
      console.error(`a-select.#convertMultiValue(): a-select is not associated with the form "${this.#internals.form.id}"`, this);
      this.#internals.form.requestSubmit();
      return;
    }

    const hidden = document.createElement('input');
    const hiddenElems = [];
    this.#internals.setFormValue('');
    input.disabled = true;
    hidden.type = 'hidden';
    hidden.name = this.#name;
    this.#value.forEach( val => {
      const hidden_ = hidden.cloneNode('true');
      hidden_.value = val;
      hiddenElems.push(hidden_);
      this.#internals.form.append(hidden_);
    });

    [...this.#internals.form.elements];
    this.#internals.form.requestSubmit();

    setTimeout( () => {
      input.disabled = false;
      hiddenElems.forEach( elem => {
        elem.remove();
      });
      this.#setValue();
    }, 100);
  }

  /**
   * Removes 'aria-selected' attribute from all options except the specified one.
   * @private
   * @param {HTMLElement | null} selected - The option element that should remain selected.
   */
  #deselectOthers(selected) {
    Array.from(this.#optionContainer.children).forEach( item => {
      if (item.dataset.type === 'optgroup') {
        Array.from(item.children).forEach( subItem => {
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
    ];

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
        item.blur();
      }
    });
  }

  /**
   * Moves each member of `options` above `before` in #optionContainer and #select.
   * Used with add(option, before);
   *
   * @param {array} options - An array of option elements to move
   * @param {string|number} before - The string value or number index of the reference option.
   */
  #moveOption(options = [], before) {
    let beforeDiv;
    let beforeOption;
    before.value || before.label || before;

    if (!isNaN(before) && before <= this.#optionContainer.children.length) {
      beforeDiv = this.#optionContainer.children[before];
      beforeOption = this.#select.children[before];
    } else {
      beforeDiv = this.#optionContainer.querySelector(`[data-value="${before}"]`);
      beforeOption = Array.from(this.#select.children).find( opt => {
        const val = opt.value || opt.label;
        return val === before;
      });
    }

    if (!beforeDiv || !beforeOption) {
      console.warn(`a-select.add(option, before): Cannot find the element having value (${before}) to insert before.`);
      return;
    }

    options.forEach(option => {
      const optvalue = option.value || option.label || option;
      const div = this.#optionContainer.querySelector(`[data-value="${optvalue}"]`);

      if (div) {
        this.#optionContainer.insertBefore(div, beforeDiv);
        this.#select.insertBefore(option, beforeOption);
      } else {
        console.warn(`a-select.add(): Error moving option with value ${optvalue}. Option was appended instead.`);
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
    if (this.#items.length === 0) return;
    this.#idx = (this.#idx + offset + this.#items.length) % this.#items.length;
    this.#highlight(this.#idx);
  }

  /**
   * Populates the internal <select> element with children from the slot or option container.
   * Updates selection based on current value attribute and triggers validity checks.
   * @private
   */
  #populateSelect(replace = true) {
    if (replace) this.#select.replaceChildren();

    // on first run, get items from this.children.
    // but when disconnected/reconnected, this.children is empty so get items from this.#optionContainer.children
    this.#items = (this.children.length) ? Array.from(this.children) : Array.from(this.#optionContainer.children);
    this.#items.forEach( item => {
        if (!(item instanceof HTMLOptionElement) && !(item instanceof HTMLOptGroupElement)) {
        console.error(`a-select: Skipping option. Option items must be either "option" or "optgroup". This item is a ${item.localName}`, this);
      } else {
        if (this.#value.includes(item.value)) item.selected = true;
        this.#select.append(item);
      }
    });

    this.#values = [...this.#select.options].map(option => option.value);
    this.#setValue();
    this.#setValidity(this.#getInvalidStates());
    this.#setOptions(replace);
  }

  /**
   * Rebuilds the DOM structure of the option picker (divs) to match the options in the internal select.
   * Applies tabindex for multiple mode and calculates height if size is set.
   * @private
   */
  #setOptions(replace = true) {
    if (replace) this.#optionContainer.replaceChildren();
    const div = document.createElement('div');
    this.#items.forEach( item => {
      let label;
      const div_a = div.cloneNode();

      if (item instanceof HTMLOptionElement) {
        div_a.append(...Array.from(item.cloneNode(true).childNodes));
        div_a.dataset.value = item.value;
      } else if (item instanceof HTMLOptGroupElement) {
        div_a.dataset.type = 'optgroup';

        if (item.hasAttribute('label')) {
          label = document.createElement('strong');
          label.textContent = item.getAttribute('label');
          div_a.append(label);
        }

        for (const opt of item.children) {
          if (opt instanceof HTMLOptionElement) {
            const div_b = div.cloneNode();
            div_b.append(...Array.from(opt.cloneNode(true).childNodes));
            div_b.dataset.value = opt.value;

            for (const attr of opt.attributes) {
              div_b.setAttribute(attr.name, attr.value);
            }

            div_a.append(div_b);
          } else if (label) {
            label.prepend(opt.cloneNode(true));
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

  #setSelected(value, toggle = true) {
    if (value === null || value === undefined) {
      this.#select.value = null;
      this.#deselectOthers(null);
      return;
    }

    if (!Array.isArray(value)) value = [value];

    value.forEach(val => {
      this.#setSelectedItem(val, toggle);
    });
  }

  #setSelectedItem(value, toggle = true) {
    let selected;
    const options = Array.from(this.#select.options);
    options.forEach(option => {
      if (option.value === value) {
        selected = this.#optionContainer.querySelector(`[data-value="${option.value}"]`);

        if (this.#multiple && toggle) {
          option.selected = !option.selected;
        } else {
          option.selected = true;
        }

        if (selected) selected.toggleAttribute('aria-selected', option.selected);
      }
    });

    if (!this.#multiple) this.#deselectOthers(selected);
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
    this.#internals.setValidity(flags, this.#select.validationMessage, this);
  }

  /**
   * Updates the internal value array from the selected options in the native <select> element.
   * Triggers external updates via abindUpdate if available and sets validity state.
   * @private
   */
  #setValue() {
    if (this.#disabled) return;
    this.#value = Array.from(this.#select.selectedOptions).map( o => o.value);
    this.#internals.setFormValue(this.value);
    this.#setValidity(this.#getInvalidStates());
    globalThis[abindUpdate]?.(this, 'value', this.#value);
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
  async add(option, before) {
    let newOptions = [];
    const frag = new DocumentFragment();

    try {
      if (typeof option === 'string') {
        // single item or comma separated items
        const newOption = document.createElement('option');
        const options = option.split(',').map(o => o.trim());
        options.forEach(item => {
          const opt = newOption.cloneNode();
          opt.textContent = item;
          if (before) newOptions.push(opt);
          frag.append(opt);
        });
      } else if (Array.isArray(option)) {
        // array of option elements
        option.forEach(opt => {
          if (before) newOptions.push(opt);
          frag.append(opt);
        });
      } else if (option instanceof HTMLOptionElement || option instanceof HTMLOptGroupElement) {
        // single option element or optgroup element containing children which are option elements
        if (before) newOptions.push(option);
        frag.append(option);
      } else {
        console.warn(`a-select.add(): requirements for new option (${option}) not met, skipping`);
      }

      await this.append(frag);

      if (before) this.#moveOption(newOptions, before);
    } catch (error) {
      console.group('a-select.add()');
      console.log('Instance', this);
      console.log('Params', {option: option, before: before});
      console.error(error);
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
  removeOption(index) {
    const item = this.#optionContainer.children.item(index);
    item.remove();
    this.#populateSelect();
    return item;
  }

  /**
   * Reports whether the form control will participate in form validation.
   * @returns {boolean}
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
  set form(value) { this.setAttribute('form', value); }

  get internals() { return this.#internals}

  /**
   * Gets or sets the name of the element (used in form submissions).
   * Updates both internal state and HTML 'name' attribute when setting.
   * @type {string | undefined}
   */
  get name() { return this.#name }
  set name(value) { this.setAttribute('name', value); }

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
  get options() { return this.#select.options }

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

  get valid() { return this.#internals.validity.valid }

  /**
   * Gets or sets the current selected value(s) as an array of strings.
   * Updates the HTML 'value' attribute (comma-separated string) when setting.
   * @type {string | string[]}
   */
  get value() { return (this.#value == null) ? null : this.#value.join(',') }
  set value(value) { this.setAttribute('value', value); }

  /**
   * Gets the current values from the internal <select> options as an array of strings.
   * Note: This is a direct getter returning an existing property, not a setter.
   * @type {string[]}
   */
  get values() { return this.#values }
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);

export { ASelect as default };
