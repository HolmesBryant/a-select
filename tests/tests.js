import app from './app.js';
import ATestRunner from './ATestrunner.min.js';

const runner = new ATestRunner(import.meta.url)

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
