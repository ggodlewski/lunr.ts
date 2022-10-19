export const suite = function (name, fn) {
	const s = new Benchmark.Suite(name, {
		onStart: function (e) {
			console.log(e.currentTarget.name);
		},
		onCycle: function (e) {
			console.log('  ' + String(e.target));
		},
		onError: function (e) {
			console.error(e.target.error);
		},
	});

	fn.call(s, s);

	s.run();
};

const wordList = await (await fetch(
	'https://github.com/sindresorhus/word-list/raw/main/words.txt',
)).text();
