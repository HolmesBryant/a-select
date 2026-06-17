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
  _active = false;
  _name;
  _multiple = false;
  _value = [];

  _abortController;
  _connected = false;
  _optionContainer;
  _select;
  _slot;

  static formAssociated = true;

  static observedAttributes = [
    'active',
    'name',
    'multiple',
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

      case 'name':
        this._name = newval;
        this._internals.name = newval;
        break;

      case 'multiple':
        this._multiple = this.hasAttribute('multiple');
        this._select.multiple = this._multiple;
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
    this._setOptions();
    this._addListeners();
    if (this._active) this.showPicker();
    this._connected = true;
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
      this._populateSelect();
    }, { signal: signal });

    this._select.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.active = !this._active;
    }, { signal: signal });

    this._optionContainer.addEventListener('pointerdown', event => {
      const option = event.target.closest('div');
      this._setSelected(option.dataset.value, option);
      if (this._multiple) return;
      this.active = false;
    }, { signal:this._abortController.signal });
  }

  _populateSelect() {
    const options = this.querySelectorAll('option');
    for (const option of options) {
      if (this._value.includes(option.value)) option.selected = true;
      this._select.append(option);
    }
  }

  _setOptions() {
    const options = this.querySelectorAll('option');
    const div = document.createElement('div');

    for (const opt of options) {
      const div_a = div.cloneNode();
      div_a.innerHTML = opt.innerHTML;
      div_a.dataset.value = opt.value;
      this._optionContainer.append(div_a);
    }
  }

  _setSelected(value, selected) {
    selected = selected || this._optionContainer.querySelector(`[data-value="${value}"]`);

    for (const option of this._select.options) {
      option.selected = false;
      console.log('before', option.selected, option)
      if (value === option.value && this._multiple) {
        option.selected = !option.selected;
        selected.toggleAttribute('data-selected', option.selected);
      } else if (value === option.value) {
        option.selected = true;
        selected.toggleAttribute('data-selected', true);
      }
      console.log('after', option.selected, option)
    }

    this._setValue();
  }

  _setValue() {
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

  // --- Getters / Setters ---

  get active() { return this._active }
  set active(value) {
    value = value != null && value !== false;
    this.toggleAttribute('active', value);
  }

  get name() { return this._name }
  set name(value) { this.setAttribute('name', value) }

  get multiple() { return this._multiple }
  set multiple(value) {
    value = value != null && value !== false;
    this.toggleAttribute('multiple', value);
  }

  get value() { return this._value }
  set value(value) { this.setAttribute('value', value) }
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
