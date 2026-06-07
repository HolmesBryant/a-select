/**
 * A custom element that renders a select element with support for images
 * @file /src/a-select.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

import AOption from './a-option.js';
import styles from './a-select-shadow.css' with {type: 'css'};

const abindUpdate = Symbol.for('abind.update');

export default class ASelect extends HTMLElement {
	// --- Attributes ---

  _autocomplete;
  _autofocus;
  _disabled;
  _form;
  _multiple = false;
  _name;
  _required;
  _size = 0;

	_active = false;
  _placeholder;
	_value = '';

	// --- Properties ---

  _selectedIndex;
  _selectedOptions;
  _type;
  _validity;
  _willValidate;

  _abortController;
  _select;
  _optionContainer;

	// --- Static ---

	static observedAttributes = [
    'active',
    'value'
  ];

	static template = document.createElement('template');

	static {
		this.template.innerHTML = `
			<div id="wrapper">
        <select id="select"></select>
				<div id="options"></div>
			</div>
		`;
	}

	constructor() {
		super();
		this.attachShadow( {mode:'open'} );
		this.shadowRoot.adoptedStyleSheets = [styles];
		this.shadowRoot.append(ASelect.template.content.cloneNode(true));
    this._select = this.shadowRoot.getElementById('select');
    this._optionContainer = this.shadowRoot.getElementById('options');
	}

	// --- Lifecycle ---

	attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;
    switch (attr) {
    case 'active':
      this._active = this.hasAttribute('active');
      break;
    case 'value':
      newval = newval.split(',');
      this._setSelected(newval);
      break;
    }
	}

	connectedCallback() {
		this._abortController = new AbortController();
		this._value = this.getAttribute('value') || '';
    this._setOptions();
    this._addListeners();
    if (this._active) this.showPicker();
	}

	disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
	}

	// --- Private ---

  _addListeners() {
    this._select.addEventListener('pointerdown', event => {
      event.preventDefault();
      this._optionContainer.classList.toggle('open');
    }, { signal:this._abortController.signal });

    this._optionContainer.addEventListener('pointerdown', event => {
      const option = event.target.closest('div');
      this._setSelected(option.dataset.value);
      this._optionContainer.classList.remove('open');
    }, { signal:this._abortController.signal });

    window.addEventListener('pointerdown', event => {
      if (event.target.closest('a-select')) return;
      if (this._optionContainer.classList.contains('open')) {
        this._optionContainer.classList.remove('open');
      }
    });
  }

  _setOptions() {
    const options = this.querySelectorAll('option');
    const div = document.createElement('div');
    for (const opt of options) {
      const div_a = div.cloneNode();
      div_a.innerHTML = opt.innerHTML;
      div_a.dataset.value = opt.value || opt.textContent;
      opt.value = opt.value || opt.textContent;
      this._optionContainer.append(div_a);
      this._select.append(opt);
    }
  }

  _setSelected(value) {
    const selected =
      this._select.querySelector(`[value="${value}"]`);
    if (selected) selected.selected = true;
  }


  // --- Public ---


  add(option, before) {
    if (typeof option === 'string') {
      const newOption = document.createElement('a-option');
      newOption.text = option;
      option = newOption;
    }
    if (before instanceof HTMLElement && this.contains(before)) {
      this.insertBefore(option, before);
    } else if (!isNaN(before) && before >= 0 && before <= this.options.length) {
      const index = Math.min(before, this.options.length - 1);
      const referenceNode = index < this.options.length ? this.options[index] : null;
      this.insertBefore(option, referenceNode);
    } else {
      this.appendChild(option);
    }
  }

  checkValidity() {

  }

  item(index) {
    return this.options[index] || null;
  }

  namedItem(name) {
    for (const option of this.options) {
      if (option.getAttribute('name') === name) {
        return option;
      }
    }
    return null;
  }

  remove(index) {
    if (index >= 0 && index < this.options.length) {
      this.removeChild(this.options[index]);
    }
  }

  reportValidity() {

  }

  setCustomValidity() {

  }

  showPicker() {
    this._optionContainer.classList.add('open');
  }

  // --- Getters / Setters

  get options() { return this.querySelectorAll('a-option') }

  get value() { return this._value }
  set value(value) { this.setAttribute('value', value) }

  get selectedIndex() {
    const options = Array.from(this.options);
    const index = options.findIndex(option => option.selected);
    return index >= 0 ? index : -1;
  }

  set selectedIndex(value) {
    if (value >= 0 && value < this.options.length) {
      const option = this.options[value];
      this.selectOption(option);
    }
  }

	// --- Getters/Setters ---
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
