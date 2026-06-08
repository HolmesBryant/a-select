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

  /**
   * @private
   * @type {boolean}
   */
	_active = false;

  /**
   * @private
   * @type { "" | "on" | "off" }
   */
  _autocomplete = "";

  /**
   * @private
   * @type
   */
  _autofocus = false;

  /**
   * @private
   * @type {boolean}
   */
  _disabled = false;

  /**
   * The id of the form element to associate with
   * @private
   * @type {string | undefined}
   */
  _form;

  /**
   *
   */
  _multiple = false;

  /**
   *
   */
  _name = 'a-select';

  /**
   *
   */
  _required;

  /**
   *
   */
  _size = 0;

  /**
   *
   */
  _value = '';

  // --- Element Properties ---

	/**
   * A NodeList of labels associated with the element.
   * @private
   * @type {NodeList}
   */
  _labels;

  /**
   * The number of option elements
   * @private
   * @type {number}
   */
  _length;

  /**
   * A NodeList representing the set of options
   * @private
   * @type {NodeList}
   */
  _options;

  /**
   * A number reflecting the index of the first selected option.
   * A value of -1 indicates no option is selected.
   * @private
   * @type {number}
   */
  _selectedIndex;

  /**
   * An HTMLCollection representing the set of options that are selected.
   * @private
   * @type {HTMLCollection}
   */
  _selectedOptions;

  /**
   * The select element's type
   * @private
   * @type {"select-one" | "select-multiple"}
   */
  _type = 'select-one';

  /**
   * A localized message that describes the validation constraints
   * that the control does not satisfy (if any).
   * It is the empty string if the control is not a candidate for constraint validation
   * (willValidate is false), or it satisfies its constraints.
   */
  _validationMessage;

  /**
   * A ValidityState reflecting the validity state that this control is in.
   * @private
   * @type {ValidityState}
   */
  _validity;

  /**
   * Indicates whether the element is a candidate for constraint validation.
   * @private
   * @type {boolean}
   */
  _willValidate;

  // --- Internal Properties ---

  /**
   * @private
   * @type {AbortController}
   */
  _abortController;

  /**
   * @private
   * @type {FormAssociatedElement}
   */
  _internals;

  /**
   * @private
   * @type {MutationObservee}
   */
  _observer;

  /**
   * @private
   * @type {HTMLElement}
   */
  _optionContainer;

  /**
   * @private
   * @type {HTMLSelectElement}
   */
  _select;

	// --- Static ---

  static formAssociated = true;

	static observedAttributes = [
    'active',
    'autocomplete',
    'autofocus',
    'multiple',
    'name',
    'required',
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
    this._internals = this.attachInternals();
		this.attachShadow({ mode: 'open', delegatesFocus: true });
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

    case 'autocomplete':
      const accept = ["", "on", "off"];
      if (accept.includes(newval)) {
        this._autocomplete = newval;
        this._select.autocomplete = newval;
      } else {
        console.error(`a-select autocomplete must be one of ["", "on", "off"], value given was ${newval}`);
      }
      break;

    case 'autofocus':
      this._autofocus = this.hasAttribute('autofocus');
      this._select.autofocus = this._autofocus;
      break;

    case 'disabled':
      this._disabled = this.hasAttribute('disabled');
      this._select.disabled = this._disabled;
      break;

    case 'form':
      const form = document.getElementById(newval);
      if (form) {
        this._form = newval;
        this._select.form = form;
      } else {
        console.error(`a-select.form: A form having id (${newval}) was not found.`);
      }
      break;

    case 'multiple':
      this._multiple = this.hasAttribute('multiple');
      this._select.multiple = this._multiple;
      this._type = this._select.type;
      break;

    case 'name':
      this._name = newval;
      this._select.name = newval;
      break;

    case 'required':
      this._required = this.hasAttribute('required');
      this._select.required = this._required;
      break;

    case 'size':
      const size = parseInt(newval);
      if (isNaN(size)) {
        console.error(`a-select.size must be an integer. The value given was ${newval}`);
      } else {
        this._size = size;
        this._select.size = size;
      }
      break;

    case 'value':
      newval = newval.split(',');
      this._setSelected(newval);
      break;
    }
	}

	connectedCallback() {
		this._abortController = new AbortController();
    this._setOptions();
    this._addListeners();
    this._setAttrs();

    this._observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          this._setOptions();
        }
      }
    });

    this._observer.observe(this, { childList: true });
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
      this._setSelected(option);
      if (this._multiple) return;
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
    this._select.innerHTML = '';

    for (const opt of options) {
      const div_a = div.cloneNode();
      div_a.innerHTML = opt.innerHTML;
      div_a.dataset.value = opt.value || opt.textContent;
      opt.value = opt.value || opt.textContent;
      this._optionContainer.append(div_a);
      this._select.append(opt.cloneNode);
    }
  }

  _setAttrs() {
    const attrs = ASelect.observedAttributes;
    for (const idx in attrs) {
      const prop = attrs[idx];
      const value = this[prop];
      this._select.setAttribute(prop, value);
      console.log(prop, value)
    }
  }

  _setSelected(option) {
    const value = option.dataset.value;
    const selected = this._select.querySelector(`[value="${value}"]`);
    if (selected) {
      selected.selected = !selected.selected;
      option.toggleAttribute('data-selected', selected.selected);
    }
    this._internals.setFormValue(this._select.selectedOptions);

    const stateSet = this._internals.states;
    console.log(stateSet)
    for (const state of stateSet.entries()) {
      console.log(state)
    }
  }


  // --- Public Methods ---

  add(option, before) {
    if (typeof option === 'string') {
      const newOption = document.createElement('option');
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

    this._setOptions();
  }

  checkValidity() {}

  item(index) {
    return this.options[index] || null;
  }

  namedItem(name) {}

  remove(index) {}

  reportValidity() {}

  setCustomValidity() {}

  showPicker() { this._optionContainer.classList.add('open'); }

  // --- Getters / Setters

  // --- attrs ---

  get active() { return this._active }
  set active(value) {
    value = value != null && value !== false;
    this.toggleAttribute('active', value);
  }

  get autocomplete() { return this._autocomplete }
  set autocomplete(value) { this.setAttribute('autocomplete', value); }

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

  get form() { return this._internals.form }
  set form(value) { this.setAttribute('form', value) }

  get multiple() { return this._multiple }
  set multiple(value) {
    value = value != null && value !== false;
    this.toggleAttribute('multiple', value);
  }

  get name() { return this._name }
  set name(value) { this.setAttribute('name', value) }

  get required() { return this._required }
  set required(value) {
    value = value != null && value !== false;
    this.toggleAttribute('required', value);
  }

  get size() { return this._size }
  set size(value) { this.setAttribute('size', value) }

  get value() { return this._value }
  set value(value) { this.setAttribute('value', value) }

  // --- properties ---

  get labels() { return this._internals.labels }

  get length() { return this._select.length }

  get options() { return this.querySelectorAll('option') }

  get selectedIndex() { return this._selectedIndex }
  set selectedIndex(value) {
    const idx = parseInt(value);
    if (isNaN(idx)) {
      console.log(`a-select.selectedIndex must be an integer, value given was ${value}`);
      return;
    }
    this._select.selectedIndex = idx;
    this._selectedIndex = this._select.selectedIndex;
  }

  get selectedOptions() { return this._select.selectedOptions }

  get type() { return this._type }

  get validationMessage() { return this._select.validationMessage }

  get validity() { return this._select.validity }

  get willValidate() { return this._select.willValidate }
}

if (!customElements.get('a-select')) customElements.define('a-select', ASelect);
