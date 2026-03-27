export interface ParsedVitalsRow {
	date: string;
	source: string | null;
	hrv: number | null;
	restingHr: number | null;
}

export interface ParsedActivityRow {
	date: string;
	source: string | null;
	steps: number | null;
	activeCalories: number | null;
	exerciseMinutes: number | null;
}

export interface WearableImportRow {
	date: string;
	source?: string;
	hrv?: number;
	restingHr?: number;
	steps?: number;
	activeCalories?: number;
	exerciseMinutes?: number;
}

interface CsvValidationSuccess<T> {
	ok: true;
	rows: T[];
}

interface CsvValidationFailure {
	ok: false;
	error: string;
}

type CsvValidationResult<T> = CsvValidationSuccess<T> | CsvValidationFailure;

const EXPECTED_FILENAMES = {
	vitals: 'vitals.csv',
	activity: 'activity.csv'
} as const;

const REQUIRED_VITALS_HEADERS = [
	'Date',
	'Source(s)',
	'Heart rate variability avg (ms)',
	'Resting heart rate avg (bpm)'
] as const;

const REQUIRED_ACTIVITY_HEADERS = [
	'Date',
	'Source(s)',
	'Steps',
	'Active Calories (kcal)',
	'Duration (min)'
] as const;

function parseCsvLine(line: string): string[] {
	const cells: string[] = [];
	let currentCell = '';
	let isQuoted = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		const nextChar = line[index + 1];

		if (char === '"') {
			if (isQuoted && nextChar === '"') {
				currentCell += '"';
				index += 1;
				continue;
			}

			isQuoted = !isQuoted;
			continue;
		}

		if (char === ',' && !isQuoted) {
			cells.push(currentCell);
			currentCell = '';
			continue;
		}

		currentCell += char;
	}

	cells.push(currentCell);
	return cells.map((cell) => cell.trim());
}

function parseCsv(text: string): Array<Record<string, string>> {
	const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

	if (normalizedText.length === 0) {
		return [];
	}

	const lines = normalizedText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length < 2) {
		return [];
	}

	const headers = parseCsvLine(lines[0]);

	return lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
	});
}

function parseOptionalNumber(value: string | undefined): number | null {
	if (value === undefined || value.trim().length === 0) {
		return null;
	}

	const parsedValue = Number.parseFloat(value);
	return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeSource(value: string | undefined): string | null {
	if (value === undefined) {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function validateFilename(fileName: string, expectedFileName: string): string | null {
	return fileName.toLowerCase() === expectedFileName
		? null
		: `Expected file name ${expectedFileName}.`;
}

function validateHeaders(
	rows: Array<Record<string, string>>,
	requiredHeaders: readonly string[]
): string | null {
	const firstRow = rows[0];

	if (!firstRow) {
		return 'The CSV file does not contain any data rows.';
	}

	const missingHeaders = requiredHeaders.filter((header) => !(header in firstRow));
	if (missingHeaders.length > 0) {
		return `Missing required column${missingHeaders.length > 1 ? 's' : ''}: ${missingHeaders.join(', ')}.`;
	}

	return null;
}

export async function parseVitalsFile(file: File): Promise<CsvValidationResult<ParsedVitalsRow>> {
	const filenameError = validateFilename(file.name, EXPECTED_FILENAMES.vitals);
	if (filenameError) {
		return { ok: false, error: filenameError };
	}

	const rows = parseCsv(await file.text());
	const headerError = validateHeaders(rows, REQUIRED_VITALS_HEADERS);
	if (headerError) {
		return { ok: false, error: headerError };
	}

	return {
		ok: true,
		rows: rows.map((row) => ({
			date: row.Date,
			source: normalizeSource(row['Source(s)']),
			hrv: parseOptionalNumber(row['Heart rate variability avg (ms)']),
			restingHr: parseOptionalNumber(row['Resting heart rate avg (bpm)'])
		}))
	};
}

export async function parseActivityFile(
	file: File
): Promise<CsvValidationResult<ParsedActivityRow>> {
	const filenameError = validateFilename(file.name, EXPECTED_FILENAMES.activity);
	if (filenameError) {
		return { ok: false, error: filenameError };
	}

	const rows = parseCsv(await file.text());
	const headerError = validateHeaders(rows, REQUIRED_ACTIVITY_HEADERS);
	if (headerError) {
		return { ok: false, error: headerError };
	}

	return {
		ok: true,
		rows: rows.map((row) => ({
			date: row.Date,
			source: normalizeSource(row['Source(s)']),
			steps: parseOptionalNumber(row.Steps),
			activeCalories: parseOptionalNumber(row['Active Calories (kcal)']),
			exerciseMinutes: parseOptionalNumber(row['Duration (min)'])
		}))
	};
}

export function mergeWearableRows(
	vitalsRows: ParsedVitalsRow[],
	activityRows: ParsedActivityRow[]
): WearableImportRow[] {
	const rowsByDate = new Map<string, WearableImportRow>();

	for (const vitalsRow of vitalsRows) {
		rowsByDate.set(vitalsRow.date, {
			...(rowsByDate.get(vitalsRow.date) ?? {}),
			date: vitalsRow.date,
			...(vitalsRow.hrv === null ? {} : { hrv: vitalsRow.hrv }),
			...(vitalsRow.restingHr === null ? {} : { restingHr: vitalsRow.restingHr }),
			...(vitalsRow.source === null ? {} : { source: vitalsRow.source })
		});
	}

	for (const activityRow of activityRows) {
		rowsByDate.set(activityRow.date, {
			...(rowsByDate.get(activityRow.date) ?? {}),
			date: activityRow.date,
			...(activityRow.steps === null ? {} : { steps: activityRow.steps }),
			...(activityRow.activeCalories === null
				? {}
				: { activeCalories: activityRow.activeCalories }),
			...(activityRow.exerciseMinutes === null
				? {}
				: { exerciseMinutes: activityRow.exerciseMinutes }),
			...(activityRow.source === null ? {} : { source: activityRow.source })
		});
	}

	return [...rowsByDate.values()].sort((left, right) => right.date.localeCompare(left.date));
}
