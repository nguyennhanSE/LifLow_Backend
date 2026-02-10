import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { LoginDto, LogoutDto, RefreshTokenRequestDto } from "./dto/auth.dto";
import { comparePassword } from "src/utils/encrypt";
import { TokenPayload } from "libs/constants/interface";
import { tokenType } from "src/common/enums";
import { config } from "src/libs/config";
import { AppLogger } from "libs/logger";
import { UserService } from "../user/user.service";
import { RolesService } from "../roles/roles.service";
import { AuthRepository } from "./repositories/auth.repository";
import { PrismaService } from "../../../prisma/prisma.service";
import { EMembershipStatus } from "../memberships/enums/membership.enum";

@Injectable()
export class AuthService {
    private readonly errorCode: string;
    private readonly context = AuthService.name;

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly userService: UserService,
        private readonly roleService: RolesService,
        private readonly logger: AppLogger,
        private readonly prisma: PrismaService,
    ) {
        this.errorCode = this.context;
    }

    // Login
    async login(dto: LoginDto) {
        this.logger.debug(`[${this.context}] login start`, dto);
        try {
            const { username: account, password, rememberMe, ip } = dto;

            if (!account) {
                throw new BadRequestException("Username is required");
            }

            const user = await this.userService.getUserByAccount(account);
            this.logger.debug(`[${this.context}] login user fetched`, { account, user });
            if (!user) {
                throw new BadRequestException("User not exist");
            }

            if (password) {
                if (!user.password) {
                    throw new UnauthorizedException("Invalid credentials");
                }
                const ok = await comparePassword(password, user.password);
                this.logger.debug(`[${this.context}] login compare password`, { account, ok });
                if (!ok) {
                    throw new UnauthorizedException("Invalid credentials");
                }
            }

            // Check membership status – block inactive/stop users
            await this.checkMembershipStatus(user.id);

            const roles = await this.roleService.getUserRoles(user.id);

            const accessTokenPayload: TokenPayload = {
                sub: user.id,
                tokenType: tokenType.AccessToken,
                username: account,
                email: user.email,
                roles
            }; 
            const refreshTokenPayload: TokenPayload = {
                sub: user.id,
                tokenType: tokenType.RefreshToken,
                username: account,
                email: user.email,
                roles
            };

            const [accessToken, refreshToken] = await Promise.all([
                this.authRepository.generateToken(accessTokenPayload, {
                    secret: config.JWT_SECRET_ACCESS_TOKEN,
                    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
                } as any),
                this.authRepository.generateToken(refreshTokenPayload, {
                    secret: config.JWT_SECRET_REFRESH_TOKEN,
                    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
                } as any),
            ]);

            this.logger.debug(`[${this.context}] login tokens issued`, {
                account,
                accessToken,
                refreshToken,
                rememberMe,
                ip,
            });

            if (refreshToken) {
                const stored = await this.authRepository.storeToken(
                    refreshToken,
                    { secret: config.JWT_SECRET_REFRESH_TOKEN },
                    ip,
                );
                // this.logger.debug(`[${this.context}] login refresh token stored`, { stored });
            }

            this.logger.debug(`[${this.context}] login done`, { account });
            return { 
                user: { 
                    email: user.email, 
                    name: user.name, 
                    id: user.id, 
                    account: account,
                    roles: roles
                }, 
                accessToken, 
                refreshToken 
            };
        } catch (err) {
            this.logger.error(`[${this.context}] login failed`, err);
            throw err;
        }
    }

    // logout
    async logout(dto: LogoutDto) {
        this.logger.debug(`[${this.context}] logout start`, dto);
        try {
            const { refreshToken } = dto;
            if (!refreshToken) {
                throw new BadRequestException("Missing refresh token");
            }

            const foundSession = await this.authRepository.findToken(refreshToken);
            this.logger.debug(`[${this.context}] logout found session`, { foundSession });

            if (!foundSession) {
                throw new UnauthorizedException("Your session is out. Please login again");
            }

            await this.authRepository.deleteToken(refreshToken);
            this.logger.debug(`[${this.context}] logout done`, { refreshToken });
            return { success: true };
        } catch (err) {
            this.logger.error(`[${this.context}] logout failed`, err);
            throw err;
        }
    }

    // refresh token
    async refreshToken(dto: RefreshTokenRequestDto) {
        this.logger.debug(`[${this.context}] refreshToken start`, dto);
        try {
            const { refreshToken, ip } = dto;
            if (!refreshToken) {
                throw new BadRequestException("Missing refresh token");
            }
            // check refresh token used
            const isRefreshTokenUsed = await this.authRepository.isRefreshTokenUsed(refreshToken)
            if (isRefreshTokenUsed) {
                const decoded = await this.authRepository.decodeToken(refreshToken, {
                    secret: config.JWT_SECRET_REFRESH_TOKEN
                })
                await this.authRepository.removeAllSessionOfUser(decoded.sub)
                throw new UnauthorizedException("Refresh token already used!! Please login again")
            }
            const decoded = await this.authRepository.decodeToken(
                refreshToken,
                { secret: config.JWT_SECRET_REFRESH_TOKEN },
            );
            this.logger.debug(`[${this.context}] refreshToken decoded`, decoded);

            if (!decoded) {
                throw new UnauthorizedException("Error when refresh token! Please login again");
            }

            const { sub, username, email } = decoded;

            const availableToken = await this.authRepository.findToken(refreshToken);
            this.logger.debug(`[${this.context}] refreshToken in store`, { availableToken });

            if (!availableToken) {
                throw new NotFoundException("Session not found");
            }

            const user = username 
                ? await this.userService.getUserByAccount(username)
                : email 
                    ? await this.userService.getUserByEmail(email)
                    : null;
            this.logger.debug(`[${this.context}] refreshToken user fetched`, { user });
            if (!user) {
                throw new NotFoundException("User not found");
            }
            const roles = await this.roleService.getUserRoles(user.id);

            const accessTokenPayload: TokenPayload = {
                sub,
                tokenType: tokenType.AccessToken,
                username: username || user.id,
                email: user.email,
                roles
            };
            const refreshTokenPayload: TokenPayload = {
                sub,
                tokenType: tokenType.RefreshToken,
                username: username || user.id,
                email: user.email,
                roles
            };

            const [accessToken, newRefreshToken] = await Promise.all([
                this.authRepository.generateToken(accessTokenPayload, {
                    secret: config.JWT_SECRET_ACCESS_TOKEN,
                    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
                } as any),
                this.authRepository.generateToken(refreshTokenPayload, {
                    secret: config.JWT_SECRET_REFRESH_TOKEN,
                    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
                } as any),
            ]);

            this.logger.debug(`[${this.context}] refreshToken new tokens`, {
                accessToken,
                newRefreshToken,
            });

            if (newRefreshToken) {
                const stored = await this.authRepository.updateToken(
                    newRefreshToken,
                    { secret: config.JWT_SECRET_REFRESH_TOKEN },
                    availableToken.id,
                    ip
                );
                this.logger.debug(`[${this.context}] refreshToken stored new RT`, { stored });
            }
            // add refresh token used 

            await this.authRepository.markRefreshTokenUsed(refreshToken, availableToken.id)
            this.logger.debug(`[${this.context}] refreshToken used`, { refreshToken });
            this.logger.debug(`[${this.context}] refreshToken done`, { userId: sub });
            return { accessToken, newRefreshToken };
        } catch (err) {
            this.logger.error(`[${this.context}] refreshToken failed`, err);
            throw err;
        }
    }

    /**
     * OAuth login (e.g. Kakao): issue access/refresh tokens for an existing userId
     * and store refresh token as a session.
     */
    async oauthLogin(userId: string, email: string, ip?: string): Promise<any> {
        this.logger.debug(`[${this.context}] oauthLogin start`, { userId, email, ip });
        try {
            const user = await this.userService.getUserByAccount(userId);
            if (!user) {
                throw new NotFoundException("User not found");
            }

            // Check membership status – block inactive/stop users
            await this.checkMembershipStatus(user.id);

            const roles = await this.roleService.getUserRoles(user.id);

            const accessTokenPayload: TokenPayload = {
                sub: user.id,
                tokenType: tokenType.AccessToken,
                username: user.id,
                email: email || user.email,
                roles,
            };
            const refreshTokenPayload: TokenPayload = {
                sub: user.id,   
                tokenType: tokenType.RefreshToken,
                username: user.id,
                email: email || user.email,
                roles,
            };

            const [accessToken, refreshToken] = await Promise.all([
                this.authRepository.generateToken(accessTokenPayload, {
                    secret: config.JWT_SECRET_ACCESS_TOKEN,
                    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
                } as any),
                this.authRepository.generateToken(refreshTokenPayload, {
                    secret: config.JWT_SECRET_REFRESH_TOKEN,
                    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
                } as any),
            ]);

            if (refreshToken) {
                await this.authRepository.storeToken(
                    refreshToken,
                    { secret: config.JWT_SECRET_REFRESH_TOKEN },
                    ip,
                );
            }

            return {
                user: {
                    email: user.email,
                    name: user.name,
                    id: user.id,
                    account: user.id,
                    roles : roles,
                },
                accessToken,
                refreshToken,
            };
        } catch (err) {
            this.logger.error(`[${this.context}] oauthLogin failed`, err);
            throw err;
        }
    }

    /**
     * Check user's membership status.
     * Throws ForbiddenException if status is inactive or stop.
     */
    private async checkMembershipStatus(userId: string): Promise<void> {
        const userMembership = await this.prisma.userMembership.findUnique({
            where: { userId },
            select: { status: true },
        });

        if (!userMembership) {
            // No membership record – allow login
            return;
        }

        const blockedStatuses: string[] = [EMembershipStatus.INACTIVE, EMembershipStatus.STOP];
        if (blockedStatuses.includes(userMembership.status ?? '')) {
            this.logger.warn(`[${this.context}] login blocked – membership status is "${userMembership.status}" for user ${userId}`);
            throw new ForbiddenException(
                `Your account is currently ${userMembership.status}. Please contact support.`,
            );
        }
    }
}
