/**
 * A custom element that renders a select element with support for images
 * @file /src/a-select.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

import styles from './a-select-shadow.css' with {type: 'css'};

const abindUpdate = Symbol.for('abind.update');

export default class ASelect extends HTMLElement {
  // --- Attributes ---

  /**
   * Whether the option picker is visible
   * @private
   * @type {boolean}
   */
  _active = false;

  /**
   * Whether the element is focused on page load
   * @private
   * @type {boolean}
   */
  _autofocus = false;

  _convertMulti = false;

  /**
   * Whether the element is disabled
   * @private
   * @type {boolean}
   */
  _disabled = false;

  /**
   * The name of the element
   * @private
   * @type {boolean}
   */
  _name;

  /**
   * The id of the form element to associate with
   * @private
   * @type {string | undefined}
   */
  _form;

  /**
   * Whether the element behaves like a select[multiple] element
   * @private
   * @type {boolean}
   */
  _multiple = false;

  /**
   * Whether a value is required
   * @private
   * @type {boolean}
   */
  _required = false;

  /**
   * How many options are visible on page load.
   * Default is 0 for select single and 4 for select multiple.
   * @private
   * @type {number}
   */
  _size = 0;

  /**
   * The value(s) sent when the associated form is submitted
   * @private
   * @type {string | array}
   */
  _value = [];

  // --- Private Properties ---

  /**
   * AbortController used by all event listeners
   * @private
   * @type {AbortController}
   */
  _abortController;

  _submitController;

  /**
   * Whether connectedCallback() has been run
   * @private
   * @type {boolean}
   */
  _connected = false;

  /**
   * Track focus index
   * @private
   * @type {number}
   */
  _idx = -1;
  _items = [];
  _optionContainer;
  _processing = false;
  _select;
  _slot;
  _values;

  // --- Public Properties

  static formAssociated = true;

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

  static template = document.createElement('template');
  static {
    this.template.innerHTML = `
      <style>
        :host { display: inline-block }
      </style>

      <div id="wrapper">
        <select id="select"></select>
        <div id="options"></div>
        <div id="overlay"></div>
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
    this._select = this.shadowRoot.getElementById('select');
    this._slot = this.shadowRoot.getElementById('slot');
    this._optionContainer = this.shadowRoot.getElementById('options');
  }

  // --- Lifecycle ---

  attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;
    switch (attr) {
      case 'active':
        this._active = this.hasAttribute('active');
        this._showPicker(this._active);
        break;

      case 'autofocus':
        this._autofocus = this.hasAttribute('autofocus');
        if (this._autofocus && this._multiple) {
          this._optionContainer.tabIndex = 0;
          this._optionContainer.focus();
        } else if (!this._autofocus && this._multiple) {
          this._optionContainer.removeAttribute('tab-index');
        } else if (this._autofocus) {
          this._select.focus();
        }
        break;

      case 'convert-multi':
        this._convertMulti = this.hasAttribute('convert-multi');
        if (this._connected) {
          if (this._convertMulti) {
            this._addSubmitListener();
          } else {
            this._submitController.abort();
            this._submitController = null;
            this._setValue();
          }
        }
        break;

      case 'disabled':
        this._disabled = this.hasAttribute('disabled');
        this._select.disabled = this._disabled;
        break;

      case 'name':
        this._name = newval;
        this._internals.name = newval;
        break;

      case 'form':
        const form = document.getElementById(newval);
        if (!form || !(form instanceof HTMLFormElement)) {
          console.error(`a-select.form - no form element with id "${newval}" was found.`, this);
          return;
        }

        this._form = newval;
        this._select.setAttribute('form', newval);
        if (this._connected && this._convertMulti) {
          this._addSubmitListener();
        }
        break;

      case 'multiple':
        this._multiple = this.hasAttribute('multiple');
        this._optionContainer.toggleAttribute('data-multiple', this._multiple);
        this._select.multiple = this._multiple;

        if (!this._connected) return;
        if (this._multiple) {
          this._select.tabIndex = "-1";
          this.active = true;
        } else {
          this.active = false;
        }

        this._setSelected(this._value, false);
        break;

      case 'required':
        this._required = this.hasAttribute('required');
        this._select.required = this._required;
        this._setValidity(this._getInvalidStates());
        break;

      case 'size':
        if (newval === null) return;
        const s = parseInt(newval);
        if (isNaN(s)) {
          console.error(`a-select.size must be a number; value given was ${newval}`, this);
        } else {
          this._size = s;
          if (this._connected) this._setSize();
        }
        break;

      case 'value':
        newval = newval.split(',').map( v => v.trim() );
        this._value = newval;
        if (this._connected) {
          this._setSelected(this._value);
          this._setValue();
        }
        break;
    }

    if (attr === 'convert-multi') {
      globalThis[abindUpdate]?.(this, 'convertMulti', this[attr]);
    } else {
      globalThis[abindUpdate]?.(this, attr, this[attr]);
    }
  }

  connectedCallback() {
    this._abortController = new AbortController();
    if (!this._name) this.name = 'a-select_' + Math.random().toString(36).slice(2, 8);
    if (this._multiple) {
      this._select.tabIndex = "-1";
      this.active = true;
    }

    this._addListeners();
    if (this._convertMulti) this._addSubmitListener();
    if (this._active) this._showPicker();

    this._connected = true;
  }

  disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    if (this._submitController) {
      this._submitController.abort();
      this._submitController = null;
    }
  }

  // --- Private Methods ---

  _addListeners() {
    const signal = this._abortController.signal;

    this._slot.addEventListener('slotchange', () => {
      if (this.children.length === 0) return;
      this._populateSelect();
      this._setSelected(this._value, false);
    }, { signal: signal });

    this._select.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (this._disabled) return;
      this._select.focus();
      this.active = !this._active;
    }, { signal: signal });

    this._select.addEventListener('change', event => {
      this._setValue();
    });

    this._optionContainer.addEventListener('pointerdown', event => {
      if (this._disabled) return;
      const option = event.target.closest('div');
      if (option.hasAttribute('disabled')) return;
      this._setSelected(option.dataset.value);
      this._setValue();
      if (this._multiple) return;
      this.active = false;
    }, { signal:this._abortController.signal });

    this._optionContainer.addEventListener('keydown', event => {
      if (this._disabled) return;
      this._handleKeyPress(event);
    }, { signal:this._abortController.signal });

    if (!this._multiple) {
      this._select.addEventListener('keydown', event => {
        this._handleKeyPress(event);
      }, { signal: this._abortController.signal });
    }

    window.addEventListener('pointerdown', event => {
      if (event.target.closest('a-select')) return;
      // this._updateBound = false;
      if (!this._multiple && this._active) this.active = false;
    });

    this._internals.form.addEventListener('reset', event => {
      // this._setSelected(this._value);
      console.log(this._value)
    }, { signal: this._abortController.signal });
  }

  _addSubmitListener() {
    if (this._submitController) {
      this._submitController.abort();
      this._submitController = null;
    }

    this._submitController = new AbortController();
    this._internals.form.addEventListener('submit', event => {
      if (this._form !== event.target.id) return;
      this._convertMultiValue(event);
    }, { signal: this._submitController.signal });
  }

  _convertMultiValue(event) {
    event.preventDefault();
    const input = this._internals.form[this._name];
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
    hidden.name = this._name;
    this._value.forEach( val => {
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

  _deselectOthers(selected) {
    Array.from(this._optionContainer.children).map( item => {
      if (item !== selected) item.removeAttribute('aria-selected');
    });
  }

  _getInvalidStates() {
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
      if (this._select.validity[name]) results[name] = this._select.validity[name];
    });

    return results;
  }

  _handleKeyPress(event) {
    const items = (this._multiple) ? this._optionContainer.children : this._select.children;
    const item = items[this._idx];
    const value = item?.dataset.value || item?.value;

    if (event.key === 'ArrowDown') {
      this._moveFocus(1);
    } else if (event.key === 'ArrowUp') {
      this._moveFocus(-1);
    } else if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      // this._setSelected(value, item);
      this._setSelected(value);
      this._setValue();
    }
  }

  _highlight(i) {
    const items = Array.from(this._optionContainer.children);
    items.forEach((item, idx) => {
      if (idx === i) {
        item.focus();
      } else {
        item.blur()
      }
    });
  }

  _moveFocus(offset) {
    this._idx = (this._idx + offset + this._items.length) % this._items.length;
    this._highlight(this._idx);
  }

  _populateSelect() {
    this._items = Array.from(this.children) || Array.from(this._optionContainer.children);
    this._items.forEach( item => {
      if (this._value.includes(item.value)) item.selected = true;
      this._select.append(item);
    });

    this._values = [...this._select.options].map(option => option.value);
    this._setValue();
    this._setValidity(this._getInvalidStates());
    this._setOptions();
  }

  _setOptions() {
    const div = document.createElement('div');
    this._optionContainer.innerHTML = "";

    this._items.forEach( item => {
      const div_a = div.cloneNode();
      div_a.innerHTML = item.innerHTML;
      div_a.dataset.value = item.value;
      for (const attr of item.attributes) {
        div_a.setAttribute(attr.name, attr.value);
      }
      if (this._multiple) div_a.tabIndex = 0;
      this._optionContainer.append(div_a);
    });

    this._setSize();
  }

  _setSelected(value, toggle = true) {
    if (!Array.isArray(value)) value = [value];
    for (const idx in value) {
      const val = value[idx];
      const selected = this._optionContainer.querySelector(`[data-value="${val}"]`);
      if (!selected) {
        console.warn(`There is no option whose value is "${val}" (case sensitive)`);
        continue;
      }

      for (const option of this._select.options) {
        if (value.includes(option.value)) {
          if (this._multiple) {
            if (toggle) option.selected = !option.selected;
            selected.toggleAttribute('aria-selected', option.selected);
          } else {
            option.selected = true;
            selected.toggleAttribute('aria-selected', true);
          }
          if (!this._multiple) this._deselectOthers(selected);
        }
      }
    }
  }

  _setSize() {
    if (this._size === 0) {
      this._optionContainer.style.removeProperty('height');
      this.removeAttribute('size');
      return;
    }
    const optElem = this._optionContainer.children[0];
    const height = (optElem.scrollHeight + 1) * this._size + 'px';
    this._optionContainer.style.height = height;
  }

  _setValidity(flags = {}) {
    this._internals.setValidity(flags, this._select.validationMessage, this);
  }

  _setValue() {
    if (this._disabled) return;
    this._value = Array.from(this._select.selectedOptions).map( o => o.value);
    this._internals.setFormValue(this.value);
    globalThis[abindUpdate]?.(this, 'value', this._value);
    this._setValidity(this._getInvalidStates());
  }

  _showPicker(open = true) {
    if (open) {
      this._optionContainer.classList.add('open');
    } else {
      this._optionContainer.classList.remove('open');
    }
  }

  // --- Public Methods ---

  add(option, before) {
    const options = this._optionContainer;
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

      this._setOptions();
    } catch (error) {
      console.group('a-select.add()');
      console.error(error);
      console.log('Instance', this);
      console.log('Params', {option: option, before: before});
      console.groupEnd();
    }
  }

  checkValidity() {
    return this._select.checkValidity();
  }

  item(index) {
    return this._optionContainer.children.item(index);
  }

  namedItem(name) {
    return this._optionContainer.children.namedItem(name);
  }

  remove(index) {
    const item = this._optionContainer.children[index];
    item.remove();
    this._populateSelect();
    return item;
  }

  reportValidity() {
    return this._select.reportValidity();
  }

  setCustomValidity(str) {
    try {
      this._select.setCustomValidity(str);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  // --- Getters / Setters ---

  get active() { return this._active }
  set active(value) {
    value = value != null && value !== false;
    this.toggleAttribute('active', value);
  }

  get autofocus() { return this._autofocus }
  set autofocus(value) {
    value = value != null && value !== false;
    this.toggleAttribute('autofocus', value);
  }

  get convertMulti() { return this._convertMulti }
  set convertMulti(value) {
    value = value != null && value !== false;
    this.toggleAttribute('convert-multi', value);
  }

  get disabled() { return this._disabled }
  set disabled(value) {
    value = value != null && value !== false;
    this.toggleAttribute('disabled', value);
  }

  get form() { return this._form }
  set form(value) { this.setAttribute('form', value) }

  get name() { return this._name }
  set name(value) { this.setAttribute('name', value) }

  get multiple() { return this._multiple }
  set multiple(value) {
    value = value != null && value !== false;
    this.toggleAttribute('multiple', value);
  }

  get options() { this._select.options }

  get required() { return this._required }
  set required(value) {
    value = value != null && value !== false;
    this.toggleAttribute('required', value);
  }

  get size() { return this._size }
  set size(value) {
    const nan = isNaN(parseInt(value));
    if (nan) {
      console.error(`a-select.size must be a number. Value given was ${value}`, this);
      return;
    }

    this.setAttribute('size', value);
  }

  get value() { return this._value }
  set value(value) { this.setAttribute('value', value) }

  get values() { return this._values }
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
