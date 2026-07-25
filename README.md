# a-select  - Form-Associated Select Element with Image Support

**ASelect** (`<a-select>`) is a custom web component that extends the native HTML `<select>` element. It provides an enhanced dropdown interface, supports rendering options as images (or any rich content), and fully integrates with the browser's form submission system via the Form Associated Custom Elements API.

Built with Shadow DOM and designed for accessibility, it allows you to create beautiful, complex option lists while maintaining native form behavior.

## Features

- **Rich Content Options:** Unlike standard `<option>` tags which only support text, a-select renders options as full HTML elements (divs) inside the picker. This allows for images, icons, checkboxes, and custom layouts.

- **Form Associated:** Automatically adds itself to a form. You may include it as a child of a form element or use the "form" attribute to associate it with a form anywhete on the page. It handles value submission correctly, including special logic for multiple selections (convert-multi).

- **Native Keyboard Support:** Full arrow key navigation (Up/Down), Enter/Space selection, and focus management within the shadow DOM.

- **Accessibility:** Exposes internal validity states, supports required, disabled, and aria attributes via standard HTML5 semantics.

- **Dynamic Management:** Programmatically add/remove options without losing state or breaking form association.

## Installation & Setup

No build step is required if using native ES modules in a browser environment.

```html
	<script type="module" src="a-select.min.js"></script>
```

```javascript
	import ASelect from "a-select.min.js";
	// Registration happens automatically

	const instance = document.querySelector('a-select');
```

## Attributes

All attributes are reactive. Changing them updates both the visual component and internal state immediately.

### active (boolean)

Toggles visibility of the option picker dropdown.

### autofocus (boolean)

Focuses the element on page load (either the select or the options container depending on mode).

### convert-multi (boolean)

If true, converts multiple selections into hidden inputs during form submit to support non-standard input types.

### disabled (boolean)

Disables the element and prevents interaction.

### form (string)

Associates this element with a specific form by ID (e.g., "my-form").

### name (string)

The name of the element used in form submissions. Auto-generated if missing.

### multiple (boolean)

Enables multiple selection mode (shows all options, allows selecting more than one option).

### required (boolean)

Marks the element as required for form validation.

### size (number)

Number of visible rows in the picker (0 = auto-expand).

### value (string)

Comma-separated list of selected values. Supports setting initial selection or updating programmatically.

## Public Methods

### add(option, before)

Adds a new option to the picker and internal select element.

**option:** Can be an existing DOM element (e.g., `<div>`) or string text content.

**before:** An existing node to insert before, or a number index (-1 for end).

```javascript
	// Add via string
	mySelect.add('New Option');

	// Add via HTML Element
	const newOpt = document.createElement('div');
	newOpt.innerHTML = '<img src="logo.png">';
	mySelect.add(newOpt);

	// Insert at specific position (index 0)
	mySelect.add('Second', 1);
```

### remove(index)

Removes an option by its zero-based index in the picker. Re-populates the internal select automatically.

```javascript
// Remove the first item (index 0)
mySelect.remove(0);
```

### item(index)

Retrieves an option element by its zero-based index in the picker container. Returns `null` if out of bounds.

```javascript
	// Get the DOM node at index 0
	const firstItem = mySelect.item(0);
	if (firstItem) {
	  console.log(firstItem.dataset.value);
	}
```

### namedItem(name)

Retrieves an option element by its `name` attribute value. Returns `null` if not found.

```javascript
	const named = mySelect.namedItem('second-option');
```

## Validation & State

### checkValidity()

Checks if the select element is valid according to HTML5 constraints. Returns a boolean.

```javascript
	const isValid = mySelectInstance.checkValidity();
	console.log(isValid);
```

### reportValidity()

Reports validity without throwing an exception. Useful for conditional UI updates.

```javascript
	if (!mySelectInstance.reportValidity()) {
	  alert('Please select a value.');
	}
```

### setCustomValidity(str)

 Sets a custom validation error message displayed in the browser's UI when invalid. Returns true on success, false on error.

```javascript
	mySelect.setCustomValidity('You must choose an option!');
	// Note: This does not automatically make it invalid; you usually need to set required=true or manipulate validity flags directly via internals if needed.
```

## Examples

### Basic Single Selection with Images

```html
<form>
	<a-select name="country">
	  <option value="FR">France</option>
	  <option value="GB">United Kingdom</option>
	  <option value="US">United States</option>
	</a-select>
</form>
```

```html
<a-select name="country" form="my-form">
  <option value="FR">France</option>
  <option value="GB">United Kingdom</option>
  <option value="US">United States</option>
</a-select>

<form id="my-form">
  <!-- The form will automatically include the selected value -->
  <button type="submit">Submit</button>
</form>
```

### Multiple Selection Mode

Enables selecting multiple options simultaneously. The picker expands to show all items, and keyboard navigation allows toggling selections.

**Note:** In multiple mode, the native select is hidden from view but used for state.

```html
<a-select name="tags" multiple>
  <option value="urgent">Urgent Task</option>
  <option value="design">Design Review</option>
  <option value="dev">Development</option>
  <option value="qa">Quality Assurance</option>
</a-select>
```

### Programmatic Control and Dynamic Options

Adding options dynamically while maintaining form association and selection state.

```javascript
import ASelect from './a-select.js';

const select = document.querySelector('a-select');

// Add a new option programmatically (inserts at the end)
select.add('<option value="JP">Japan</option>');

// Insert before an existing element
select.add('<option value="CA">Canada</option>', '<option>USA</option>');
// Assumes option>USA</option> exists in DOM

// Remove an option by index
select.remove(0);

// Get current selected values (array of strings)
console.log(select.value); // ['United States', 'France']

// Set new value programmatically
select.value = 'Japan';

// If in multi-mode
select.value = 'Japan, USA'

```

### Form Submission with convert-multi

Unfortunately, when setting the `multiple` attribute to make the component behave like a `<select multiple>` input, ElementInternals.setFormValue() serializes the selected options as ['element-name', 'value1, value2'], which is then encoded as `element-name=value1%2Cvalue2` (decoded as: element-name=value1,value2).

The selected options of a normal `<select multiple>` input are serialized as ['element-name', 'value1'] ['element-name', 'value2'] which are encoded as `element-name=value1&element-name=value2`.

If you need your data to be formatted like a normal `<select multiple>` element, add the `convert-multi` attribute. It adds a `submit` event listener that:

- Appends to the associated form a hidden input for each selected option.

- Disables the a-select input so it is not submitted.

- Then enables the a-select input and removes the hidden inputs after the form is submitted.

This effectively converts the values to the "normal" `<select multiple>` format when the form is submitted.

```html
<a-select multiple convert-multi>
	...
</a-select>
```

If you use the `convert-multi` attribute and also add your own `submit` event listener, you must enclose your logic in a setTimeout() function to move its execution to the end of the processing queue. If you do not do this, your logic may execute before `a-select` has a chance to transform the data.

```javascript
	myForm.addEventListener('submit', event => {
		event.preventDefault();
		setTimeout( () => {
			// add your logic here
		});
	});
```

## Theming

You can theme a-select via css by using custom css variables of the special ::part() selector.

```html
<style>
	a-select {
		--accent-color: dodgerblue;
		--accent-text: white;
		--background: linen;
		--border-color: silver;
		--border-radius: 5px;
		--hover-brightness: .9;
		--cursor: pointer;
		--option-height: 35px;
		--pad: .5rem;
		--text-color: rgb(40,40,40);
		--transition-duration: .25s;
	}

	a-select[active] { ... }

	/* Contains a native select element and the container holding the options */
	a-select::part(wrapper) { ... }

	/* The select element used to store state. In "multiple" mode it is hidden. */
	a-select::part(select) { ... }

	/* Container for the options. The options are <div> elements */
	a-select::part(options) { ... }
</style>
```

## Under the Hood

**Form Associated:** Uses attachInternals() to expose validity states and form submission hooks.

**AbortControllers:** All event listeners use AbortController signals for safe cleanup during lifecycle events.

**abindUpdate Hook:** Exposes a global symbol `Symbol.for('abind.update')` that can be used by [a-bind](https://github.com/HolmesBryant/a-bind) to track reactive updates.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the LICENSE file for details.
