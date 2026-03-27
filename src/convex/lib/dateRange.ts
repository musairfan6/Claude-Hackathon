const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateString(value: string) {
	return new Date(`${value}T00:00:00Z`);
}

function formatDateString(value: Date) {
	return value.toISOString().slice(0, 10);
}

export function getTrailingDateRange(endDate: string, days: number) {
	const parsedEndDate = parseDateString(endDate);
	const startDate = new Date(parsedEndDate.getTime() - (days - 1) * MS_PER_DAY);

	return {
		startDate: formatDateString(startDate),
		endDate,
		dates: Array.from({ length: days }, (_, index) =>
			formatDateString(new Date(startDate.getTime() + index * MS_PER_DAY))
		)
	};
}

export function isDateInRange(value: string, startDate: string, endDate: string) {
	return value >= startDate && value <= endDate;
}
