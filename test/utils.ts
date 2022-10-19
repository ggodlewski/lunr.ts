import {
	assert,
	assertEquals,
	fail,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';

const sortFn = (a: string, b: string): number => a.localeCompare(b);

export function assertSameMembers(
	set1?: string[] | undefined,
	set2?: string[] | undefined,
) {
	if (!set1) {
		set1 = [];
	}
	if (!set2) {
		set2 = [];
	}
	return set1.sort(sortFn).join(',') === set2.sort(sortFn).join(',');
}

export function assertInstanceOf(target: any, constructor: Function) {
	try {
		const isInstanceOf = target instanceof constructor;
		assert(isInstanceOf);
	} catch (err) {
		if (err instanceof TypeError) {
			throw new Error(
				'The instanceof assertion needs a constructor but ' +
					constructor + ' was given.',
			);
		}
		throw err;
	}
}

export function assertApproximately(
	obj: number,
	expected: number,
	delta: number,
	msg = 'the arguments to closeTo or approximately must be numbers',
) {
	assert(
		Math.abs(obj - expected) <= delta,
		msg + ' abs(' + obj + '-' + expected + ') == ' +
			Math.abs(obj - expected) + ' > ' + delta,
	);
}

export function assertDeepProperty(obj: any, path: string) {
	const parts = path.split('.');
	for (const part of parts) {
		assert(part in obj);
		obj = obj[part];
	}
}

export function assertLengthOf(arr: any[], len: number) {
	assertEquals(arr.length, len);
}

export function assertDoesNotThrow(callback: Function) {
	try {
		callback();
	} catch (err) {
		fail(err);
	}
}
