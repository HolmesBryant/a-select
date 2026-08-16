import ATestRunner from './ATestrunner.min.js';
import '../src/a-select.js';

const runner = new ATestRunner(import.meta.url)
runner.output = "test-results";

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

group("General", async () => {
	const app = document.createElement('a-select');
	document.body.append(app);

	test("It has a default name", async () => {
		return app.internals.name != null;
	}, true);

	test("Setting `name` to 'foo'", async () => {
		app.name = 'foo';
		return app.internals.name;
	}, 'foo');

	test("When it is a child of a form, the form adopts it", async () => {
		const form = document.getElementById('original-form');
		await form.append(app);
		return app.internals.form != null;
	}, true);

	test("Setting `form='other-form'` associates it with other-form", () => {
		app.form = 'other-form';
		return app.internals.form?.id;
	}, 'other-form');

	test("Removing the `form` attribute resets the associated form", () => {
		app.removeAttribute('form');
		return app.internals.form.id;
	}, 'original-form');

	test("When an option has `selected` attribute, it is selected", async () => {
		const optionOne = document.createElement('option');
		const optionTwo = document.createElement('option');
		optionOne.textContent = 'one';
		optionTwo.textContent = 'two';
		optionTwo.toggleAttribute('selected', true);
		const options = [optionOne, optionTwo];
		app.add(options);
		await when(app.values, 10);
		app.remove();
		return app.value;
	}, 'two');
});

group("Select Single Functionality", async () => {
	let submitted = false;
	const app = document.createElement('a-select');
	const select = app.shadowRoot.querySelector('select');
	app.add('three, four');
	const opt = document.createElement('option');
	opt.value = "";
	opt.textContent = "novalue";
	app.add(opt);
	await document.body.append(app);

	test("Setting `active=true` shows the picker", async () => {
		app.active = true;
		const result = await when(app.shadowRoot.querySelector('.open'), 10);
		return result != null;
	} , true);

	test("Setting `active=false` hides the picker", async () => {
		app.active = false;
		const result = await when(() => app.shadowRoot.querySelector('.open'), 10);
		return result;
	}, null);

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
		app.value = 'four';
		return select.selectedOptions[0].value;
	}, 'four');

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
		return result;
	}, true);

	test('Setting `value=""` (when required is false) selects the option whose value is "" (empty string)', async () => {
		app.value = "";
		const result = select.selectedOptions[0].value;
		app.remove();
		return result;
	}, "");
});

group("Select (single) Validation", async () => {
	const app = document.createElement('a-select');
	app.add('one, two');
	const opt = document.createElement('option');
	opt.value = "";
	opt.textContent = "novalue";
	app.add(opt);
	await document.body.append(app);

	test("Setting `required=true` when option is selected and has a value passes validation", () => {
		app.required = true;
		app.value = 'two';
		return app.valid;
	}, true);

	test("Setting `required=true` when value is null fails validation", () => {
		app.value = null;
		return app.valid;
	}, false);

	test("Setting `required=true` when in single mode (multiple is false) and value is empty string fails validation", async () => {
		app.value = "";
		const result = app.valid;
		app.remove();
		return result;
	}, false);
});

group("Select (single) Form Submission", async () => {
	const app = document.createElement('a-select');
	const form = document.getElementById('original-form');
	app.add('one, two');
	await form.append(app);

	test("It is associated with a form when it is child of the form", () => {
		return app.internals.form.id;
	}, 'original-form');

	test("It is associated with another form when `form=other-form`", () => {
		app.form = 'other-form';
		return app.internals.form.id;
	}, 'other-form');

	test("It is included with form submission", () => {
		app.debug = true;
		let length = 0;
		const form = app.internals.form;
		function submitSingle(event) {
			event.preventDefault();
			const data = new FormData(form);
			for (const entry of data.entries()) {
				length++;
			}
		}

		form.addEventListener('submit', submitSingle);
		form.requestSubmit();
		const result = length > 0;
		form.removeEventListener('submit', submitSingle);
		setTimeout(() => {app.remove()}, 100);
		return result;
	}, true);
});

group("Select Multiple functionality", () => {
	const app = document.createElement('a-select');
	const select = app.shadowRoot.querySelector('select');
	const form = document.getElementById('original-form');
	app.add('one, two, three');
	app.name = "foo";
	app.multiple = true;
	form.append(app);

	test("Setting `multiple=true` converts it to a select multiple", () => {
		app.multiple = true;
		return select.hasAttribute('multiple');
	}, true)

	test("Setting `value = val1, val2` selects multiple options", async () => {
		app.value = 'one, two';

		const result = select.selectedOptions.length === 2;
		return result;
	}, true);

	test("Value is included with form submission", async () => {
		app.debug = false;
		let content;
		const form = app.internals.form;
		function submit(event) {
			event.preventDefault();
			const data = new FormData(form);
			content = JSON.stringify(Array.from(data.entries()));
		}

		form.addEventListener('submit', submit);
		await wait(10);
		form.requestSubmit();
		form.removeEventListener('submit', submit);
		app.remove();
		return content;
	}, '[["foo","one,two"]]');
});

group("convertMulti functionality", async () => {
	const form = document.createElement('form');
	const app = document.createElement('a-select');
	form.id = "convert-multi-form";
	app.multiple = true;
	app.convertMulti = true;
	app.add('one, two, three');
	document.body.append(form);
	await form.append(app);
	app.value = "two, three";

	await test("convert-multi transforms the data to normal select <multiple> format", async () => {
		app.name = "foo";
		let content;

		function submit(event) {
			if (app.name !== 'foo') return;
			event.preventDefault();
			const data = new FormData(form);
			content = JSON.stringify(Array.from(data.entries()));
		}

		form.addEventListener('submit', submit);
		form.requestSubmit();
		form.removeEventListener('submit', submit);
		return content;
	},'[["foo","two"],["foo","three"]]');

	await test("Setting `convertMulti=false` reverts form data to default format", async () => {
		let content;
		app.name = "bar";
		app.convertMulti = false;

		function submit(event) {
			if (app.name !== 'bar') return;
			event.preventDefault();
			const data = new FormData(form);
			content = JSON.stringify(Array.from(data.entries()));
		}

		await when( () => app.internals.form.bar.disabled === false);
		form.addEventListener('submit', submit);
		form.requestSubmit();
		form.removeEventListener('submit', submit);
		app.remove();
		return content;
	}, '[["bar","two,three"]]');
});

runner.run();
