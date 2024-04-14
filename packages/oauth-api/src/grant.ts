export enum GrantType {
	CODE = 'code',
	TOKEN = 'token',
	// IMPLICIT = 'implicit'
}

export function resolveGrantType(input: string) {
	for (const [ key, value ] of Object.entries(GrantType)) {
		if (value == input) {
			return GrantType[key as keyof typeof GrantType];
		}
	}
	return undefined;
}