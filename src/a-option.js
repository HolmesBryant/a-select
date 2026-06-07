/**
 * A custom element that renders an option element with support for images
 * @file /src/a-option.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

import styles from './a-option-shadow.css' with {type: 'css'};

const abindUpdate = Symbol.for('abind.update');

export default class AOption extends HTMLOptionElement {
	// --- Attributes ---



	// --- Properties ---



	// --- Static ---

	static observedAttributes = ['value'];

	static template = document.createElement('template');
	static {
		this.template.innerHTML = `
			<slot name="icon"></slot>
			<slot></slot>
		`;
	}

	constructor() {
		super();
		this.attachShadow( {mode:'open'} );
		this.shadowRoot.adoptedStyleSheets = [styles];
		this.shadowRoot.append(AOption.template.content.cloneNode(true));
	}

	// --- Lifecycle ---

	attributeChangedCallback(attr, oldval, newval) {
		if (newval === oldval) return;
		switch (attr) {
		case 'value':
			this._value = newval;
			globalThis[abindUpdate]?.(this, attr, newval);
			break;
		}
	}

	connectedCallback() {
		/*this._abortController = new AbortController();
		this._parentElem = this.closest(this._parent);
		this.value = this._value || this.textContent;
		this._addListeners();
		this._connected = true;*/
	}

	disconnectedCallback() {
		/*if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}*/
	}

	// --- private ---

	_addListeners() {
		this.addEventListener('pointerdown', event => {
			this._setOption();
		}, { signal:this._abortController.signal });
	}

	_setOption() {
		this._parentElem.value = this._value;
	}

	// --- Getters/Setters ---

	get value() { return this._value }
	set value(value) { this.setAttribute('value', value) }
}

if (!customElements.get('a-option')) customElements.define('a-option', AOption, {extends:'option'});
