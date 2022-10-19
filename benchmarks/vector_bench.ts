import { Vector } from '../src/Vector.ts';

let index, val;

const v1 = new Vector(),
	v2 = new Vector();

for (let i = 0; i < 1000; i++) {
	index = Math.floor(i + Math.random() * 100);
	val = Math.random() * 100;
	v1.insert(i, val);
}

for (let i = 0; i < 1000; i++) {
	index = Math.floor(i + Math.random() * 100);
	val = Math.random() * 100;
	v2.insert(i, val);
}

Deno.bench('Vector.magnitude', () => {
	v1.magnitude();
});

Deno.bench('Vector.dot', () => {
	v1.dot(v2);
});

Deno.bench('Vector.similarity', () => {
	v1.similarity(v2);
});
