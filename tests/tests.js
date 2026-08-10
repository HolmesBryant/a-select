import ATestRunner from './ATestrunner.min.js';
import '../src/a-select.js';

const runner = new ATestRunner(import.meta.url)
// runner.output = "#results";

const {
	benchmark,
	equal,
	genCombos,
	group,
	info,
	skip,
	spyOn,
	test,
	throws,
	wait,
	when
} = runner;

// let app = document.getElementById('test');
let app;

async function setup() {
	const elem = document.createElement('a-select');
	await document.body.append(elem);
	return elem;
}

group("General", async () => {
	app = await setup();

	test("It has a default name", async () => {
		return app._internals.name != null;
	}, true);

	test("Setting `name` to 'foo'", async () => {
		app.name = 'foo';
		return app._internals.name;
	}, 'foo');

	test("When it is a child of a form, the form adopts it", async () => {
		const form = document.getElementById('original-form');
		await form.append(app);
		return app._internals.form != null;
	}, true);

	test("Setting `form='other-form'` associates it with other-form", () => {
		app.form = 'other-form';
		return app._internals.form?.id;
	}, 'other-form');

	test("Removing the `form` attribute resets the associated form", () => {
		app.removeAttribute('form');
		return app._internals.form.id;
	}, 'original-form');

	test("When an option has `selected` attribute, it is selected", async () => {
		const optionOne = document.createElement('option');
		const optionTwo = document.createElement('option');
		optionOne.textContent = 'one';
		optionTwo.textContent = 'two';
		optionTwo.toggleAttribute('selected', true);
		const options = [optionOne, optionTwo];
		app.add(options);
		await when(app.values);
		app.remove();
		return app.value;
	}, 'two');
});



group("Select Single Functionality", async () => {
	let submitted = false;
	app = await setup();
	const select = app.shadowRoot.querySelector('select');

	test("Setting `active=true` shows the picker", async () => {
		app.active = true;
		const result = await when(app.shadowRoot.querySelector('.open'), 10);
		return result != null;
	} , true)

	test("Setting `active=false` hides the picker", async () => {
		app.active = false;
		const result = await when(app.shadowRoot.querySelector('.open'), 10);
		return result != null;
	}, false)

	test("Setting `autofocus=true` focuses it", async () => {
		app.autofocus = true;
		const result = await when(select.hasAttribute('autofocus'));
		return result;
	}, true);

	test("Setting `autofocus=false` defocuses it", async () => {
		app.autofocus = false;
		return await when(select.hasAttribute('autofocus'), 10);
	}, false);

	test("Setting `disabled=true` disables it", async () => {
		app.disabled = true;
		return await when(select.disabled);
	}, true);

	test("Setting `disabled=false` enables it", async () => {
		app.disabled = false;
		return await when(select.disabled, 10);
	}, false);

	test("Setting value causes the appropriate option to be selected", () => {
		app.value = 'One';
		return select.selectedOptions[0].value === 'One';
	}, true);

	test("Setting `size=2` causes two options to be visible", () => {
		app.size = 2;
		const result = select.size === 2;
		app.size = 0;
		return result;
	}, true);

	test("Setting `value=null` deselects all options", async () => {
		app.value = null;
		const result = select.selectedOptions.length === 0;
		await wait(10);
		app.value = "svg";
		return result;
	}, true);

	test("Setting `required=true` when option is selected and has a value passes validation", () => {
		app.value = 'svg';
		app.required = true;
		return app.valid;
	}, true);

	test("Setting `required=true` when value is empty string fails validation", () => {
		app.required = true;
		app.value = null;
		return app.valid;
	}, false);

	test("It is included with form submission", async () => {
		let length = 0;
		const form = app._internals.form;
		function submitSingle(event) {
			event.preventDefault();
			const data = new FormData(form);
			for (const entry of data.entries()) {
				length++;
			}
		}
		form.addEventListener('submit', submitSingle);
		await wait(10);
		form.requestSubmit();
		const result = length > 0;
		form.removeEventListener('submit', submitSingle);
		app.remove();
		return result;
	}, true);
});

/*group("Select Multiple functionality", () => {
	const select = app.shadowRoot.querySelector('select');

	test("Setting `multiple=true` converts it to a <select multiple>", () => {
		app.multiple = true;
		return select.hasAttribute('multiple');
	}, true)

	test("Setting `value = val1, val2` selects multiple options", async () => {
		app.value = 'svg, img';
		const result = select.selectedOptions.length === 2;
		return result;
	}, true);

	test("multiple values are included with form submission", async () => {
		let length = 0;
		const form = app._internals.form;
		function submit(event) {
			event.preventDefault();
			const data = new FormData(form);
			for (const entry of data.entries()) {
				length++;
			}
		}
		form.addEventListener('submit', submit);
		await wait(10);
		form.requestSubmit();
		const result = length == 2;
		form.removeEventListener('submit', submit);
		return result;
	}, true);

	test("convert-multi transforms the data to normal select <multiple> format", async () => {
		let converted;
		app.debug = true;
		app.convertMulti = true;
		const form = app._internals.form;
		function submitMulti(event) {
			event.preventDefault();
			setTimeout(() => {
				const data = new FormData(form);
				for (const entry of data.entries()) {
					console.log(entry);
				}
			});
		}

		form.addEventListener('submit', submitMulti);
		await(10);
		form.requestSubmit();
	}, true);

});*/

runner.run();
