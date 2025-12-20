export enum ErrorKey {
	// Common error key
	UNKNOW_ERR_KEY = 'unkonw.err',
	ENTITY_EXISTED_KEY = 'entity.existed.err',
	DUPLICATE_KEY = 'duplicate.key.err',
	DATA_PROCESS_ERR_KEY = 'data.process.err',
	REQUEST_INVALID_ERR_KEY = 'request.invalid.err',
	ENTITY_NOT_FOUND_KEY = 'entity.not.found.err',
	VALIDATION_ERROR_KEY = 'validation.error.err',

	// specific error key
	USER_ALREADY_EXISTS_KEY = 'user.already.exists.err',
	LOGIN_FAILED_KEY = 'login.failed.err',
	AUTHENTICATION_FAILED_KEY = 'authentication.failed.err',
	RESET_KEY_INVALID_KEY = 'reset.key.invalid.err',
	RESET_KEY_EXPIRED_KEY = 'reset.key.expired.err',
	ACTIVATION_KEY_INVALID_ERR_KEY = 'activation.key.invalid.err',
	ACTIVATION_KEY_EXPIRED_ERR_KEY = 'activation.key.expired.err',

	DUPLICATED = 'duplicated.err',
	NOT_EMPTY = 'not.empty.err',
	IS_EMPTY = 'is.empty.err',

	VALUE_INVALID_ERR_KEY = 'value.invalid.err',
	PROCESS_VIDEO_ITEM_ERR_KEY = 'process.videoitem.err',
	CCONDITION_FAILED_ERR_KEY = 'condition.failed.err',
	FORBIDDEN = "forbidden",

	// User-specific error keys
	PASSWORD_SAME_ERR_KEY = 'password.same',
	USER_NOT_FOUND_ERR_KEY = 'user.not.found',
	PASSWORD_FORMAT_ERR_KEY = 'password.format',
}

export const errorMessage = {
	[ErrorKey.UNKNOW_ERR_KEY]: 'System error occured. Please try again later.',
	[ErrorKey.ENTITY_EXISTED_KEY]: 'Entity already exists',
	[ErrorKey.DUPLICATE_KEY]: 'Duplicate key',
	[ErrorKey.DATA_PROCESS_ERR_KEY]: 'Processing data has error',
	[ErrorKey.REQUEST_INVALID_ERR_KEY]: 'Request is invalid',
	[ErrorKey.ENTITY_NOT_FOUND_KEY]: 'Entity not found',
	[ErrorKey.VALIDATION_ERROR_KEY]: 'Validation error',

	[ErrorKey.USER_ALREADY_EXISTS_KEY]: 'User Already Exists',
	[ErrorKey.LOGIN_FAILED_KEY]: 'Login/password incorrect or inactive',
	[ErrorKey.RESET_KEY_INVALID_KEY]: 'Reset key invalid',
	[ErrorKey.RESET_KEY_EXPIRED_KEY]: 'Reset key expired',
	[ErrorKey.ACTIVATION_KEY_INVALID_ERR_KEY]: 'Activation key is invalid',
	[ErrorKey.ACTIVATION_KEY_EXPIRED_ERR_KEY]: 'Activation key is expired',

	[ErrorKey.DUPLICATED]: 'Duplicate',
	[ErrorKey.NOT_EMPTY]: 'Not Empty',
	[ErrorKey.IS_EMPTY]: 'Is Empty',

	[ErrorKey.VALUE_INVALID_ERR_KEY]: 'Value invalid',
	[ErrorKey.PROCESS_VIDEO_ITEM_ERR_KEY]: 'Processing video item has error',
	[ErrorKey.CCONDITION_FAILED_ERR_KEY]: 'Condition failed',

	// User-specific error messages
	[ErrorKey.PASSWORD_SAME_ERR_KEY]: 'New password cannot be the same as current password',
	[ErrorKey.USER_NOT_FOUND_ERR_KEY]: 'User not found',
	[ErrorKey.PASSWORD_FORMAT_ERR_KEY]: 'Password is not in the right format',
};
