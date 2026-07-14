# a-select Custom Element

## Notes

- **`<a-select multiple>`** : This component make extensive use of the ElementInternals API to make the custom element compatible with normal vanilla HTML forms.

Unfortunately, when setting the `multiple` attribute to make the component behave like a `<select multiple>` input, ElementInternals.setFormValue() serializes the selected options as ['element-name', 'value1, value2'], which is then encoded as `element-name=value1%2Cvalue2` (decoded as: element-name=value1,value2).

The selected options of a normal vanilla `<select multiple>` input are serialized as ['element-name', 'value1'] ['element-name', 'value2'] which are encoded as `element-name=value1&element-name=value2`.

This means you will proobably need to write some custom logic to handle form submissions from `<a-select multiple>` custom elements.
