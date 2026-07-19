# a-select Custom Element

## Notes

- **`<a-select multiple>`** : This component makes extensive use of the ElementInternals API to make the custom element compatible with normal HTML forms.

Unfortunately, when setting the `multiple` attribute to make the component behave like a `<select multiple>` input, ElementInternals.setFormValue() serializes the selected options as ['element-name', 'value1, value2'], which is then encoded as `element-name=value1%2Cvalue2` (decoded as: element-name=value1,value2).

The selected options of a normal `<select multiple>` input are serialized as ['element-name', 'value1'] ['element-name', 'value2'] which are encoded as `element-name=value1&element-name=value2`.

For this reason, there is a special attribute `convert-multi` which, when present, adds a `submit` event listener that:

	- Appends to the associated form a hidden input for each selected option.
	- Disables the a-select input so it is not submitted.
	- Then enables the a-select input and removes the hidden inputs after the form is submitted.

This effectively converts the values to the "normal" `<select multiple>` format when the form is submitted.

If you use the `select-multi` attribute and also add your own `submit` event listener, you must enclose your logic in a setTimeout() function to move it to the bottom of the processing queue. If you do not do this, your logic may execute before `a-select` has a chance to transform the data.

```javascript
	myForm.addEventListener('submit', event => {
		event.preventDefault();
		setTimeout( () => {
			// add your logic here
		});
	});
```
