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
   * Default is undefined for select single and 4 for select multiple.
   * @private
   * @type {number}
   */
  _size;

  /**
   * The value(s) sent when the associated form is submitted
   * @private
   * @type {string | array}
   */
  _value = [];

  // --- Properties ---

  /**
   * AbortController used by all event listeners
   * @private
   * @type {AbortController}
   */
  _abortController;

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
  _items;
  _optionContainer;
  _processing = false;
  _select;
  _slot;

  static formAssociated = true;

  static observedAttributes = [
    'active',
    'autofocus',
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
        this.showPicker(this._active);
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
        break;

      case 'multiple':
        this._multiple = this.hasAttribute('multiple');
        this._select.multiple = this._multiple;
        this._optionContainer.toggleAttribute('data-multiple', this._multiple);
        break;

      case 'required':
        this._required = this.hasAttribute('required');
        this._select.required = this._required;
        break;

      case 'size':
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
        if (this._connected) this._setSelected(this._value);
        break;
    }
  }

  connectedCallback() {
    this._abortController = new AbortController();
    if (!this._name) this.name = 'a-select_' + Math.random().toString(36).slice(2, 8);
    if (this._multiple) this._select.tabIndex = "-1";

    this._addListeners();
    if (this._active) this.showPicker();
    this._connected = true;
    console.log(this._internals.validity, this)
  }

  disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  // --- Private Methods ---

  _addListeners() {
    const signal = this._abortController.signal;

    this._slot.addEventListener('slotchange', () => {
      if (this.children.length === 0) return;
      this._populateSelect();
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
      this._setSelected(option.dataset.value, option);
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
      if (!this._multiple && this._active) this.active = false;
    });
  }

  _deselectOthers(selected) {
    Array.from(this._optionContainer.children).map( item => {
      if (item !== selected) item.removeAttribute('aria-selected');
    });
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
      this._setSelected(value, item);
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
    this._items = Array.from(this.children);
    this._items.forEach( item => {
      if (this._value.includes(item.value)) item.selected = true;
      this._select.append(item);
    });

    this._setOptions();
  }

  _setOptions() {
    const div = document.createElement('div');
    this._optionContainer.innerHTML = "";

    this._items.forEach( item => {
      const div_a = div.cloneNode();
      div_a.innerHTML = item.innerHTML;
      div_a.dataset.value = item.value;
      if (this._multiple) div_a.tabIndex = 0;
      this._optionContainer.append(div_a);
    });

    this._setSize();
  }

  _setSelected(value, selected) {
    selected = selected || this._optionContainer.querySelector(`[data-value="${value}"]`);
    for (const option of this._select.options) {
      if (value === option.value) {
        option.selected = !option.selected;
        selected.toggleAttribute('aria-selected', option.selected);
        if (!this._multiple) this._deselectOthers(selected);
      }
    }

    this._setValue();
  }

  _setSize() {
    if (!this._multiple && !this._size) return;
    const optElem = this._optionContainer.children[0];
    const size = (optElem.scrollHeight + 1) * this._size + 'px';
    this._optionContainer.style.height = size;
    this.togglePicker();
  }

  _setValue() {
    if (this._disabled) return;
    this._value = Array.from(this._select.selectedOptions).map( o => o.value);
    this._internals.setFormValue(this._value);
  }

  // --- Public Methods ---

  showPicker(open = true) {
    if (open) {
      this._optionContainer.classList.add('open');
    } else {
      this._optionContainer.classList.remove('open');
    }
  }

  togglePicker() {
    if (this._size === 0) {
      this.active = !this._active;
    } else {
      this.active = true;
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
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
