import { Injectable } from "@nestjs/common";
import { JwtService, JwtSignOptions, JwtVerifyOptions } from "@nestjs/jwt";
import { Session as PrismaSession } from "@prisma/client";

import { AppLogger } from "libs/logger";
import { PrismaService } from "prisma/prisma.service";

import { TokenPayload } from "libs/constants/interface";
import { RefreshTokenDto } from "../dto/auth.dto";
import { expToDate } from "src/utils/date";

@Injectable()
export class AuthRepository {
    private readonly context = AuthRepository.name;

    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly logger: AppLogger,
    ) { }

    private toDto(s: PrismaSession): RefreshTokenDto {
        return {
            refreshToken: s.refreshToken,
            // userId: s.userId,
            id: s.id,
            ip: s.ip ?? "",
        };
    }

    async generateToken(payload: TokenPayload, options: JwtSignOptions): Promise<string> {

        const meta = { sub: payload.sub, opts: options };
        try {
            this.logger.debug(`[${this.context}] generateToken start`, meta);
            const token = await this.jwtService.signAsync(payload, options);
            this.logger.debug(`[${this.context}] generateToken done`, { ...meta, issued: true });
            return token;
        } catch (err) {
            this.logger.error(`[${this.context}] generateToken failed`, { ...meta, err });
            throw err;
        }
    }

    async decodeToken(token: string, options: JwtVerifyOptions): Promise<TokenPayload> {
        const meta = { opts: options, token };
        try {
            this.logger.debug(`[${this.context}] decodeToken start`, meta);
            const payload = await this.jwtService.verifyAsync<TokenPayload>(token, options);
            this.logger.debug(
                `[${this.context}] decodeToken done`,
                { ...meta, sub: payload?.sub, exp: payload?.exp }
            );
            return payload;
        } catch (err) {
            this.logger.error(`[${this.context}] decodeToken failed`, { ...meta, err });
            throw err;
        }
    }

    async storeToken(token: string, options: JwtVerifyOptions, ip?: string): Promise<RefreshTokenDto> {
        const meta = { ip, opts: options, token };
        try {
            this.logger.debug(`[${this.context}] storeToken start`, meta);

            const { sub, exp } = await this.jwtService.verifyAsync<TokenPayload>(token, options);
            if (!sub) {
                const e = new Error("Invalid token payload: missing sub");
                this.logger.warn(`[${this.context}] storeToken invalid payload`, meta);
                throw e;
            }
            if (!exp) {
                const e = new Error("Invalid token payload: missing exp");
                this.logger.warn(`[${this.context}] storeToken invalid payload`, meta);
                throw e;
            }

            await this.prisma.session.deleteMany({ where: { refreshToken: token } });

            const expiredAt = expToDate(exp)

            const created = await this.prisma.session.create({
                data: { userId: sub, refreshToken: token, expiredAt, ip },
            });

            const dto = this.toDto(created);
            this.logger.debug(
                `[${this.context}] storeToken done`,
                { ...meta, userId: sub, expiredAt: expiredAt.toISOString() }
            );
            return dto;
        } catch (err) {
            this.logger.error(`[${this.context}] storeToken failed`, { ...meta, err });
            throw err;
        }
    }

    async updateToken(token: string, options: JwtVerifyOptions, id: string, ip?: string): Promise<RefreshTokenDto> {
        const meta = { ip, opts: options, token };
        try {
            this.logger.debug(`[${this.context}] updateToken start`, meta);

            const { sub, exp } = await this.jwtService.verifyAsync<TokenPayload>(token, options);
            if (!sub) {
                const e = new Error("Invalid token payload: missing sub");
                this.logger.warn(`[${this.context}] updateToken invalid payload`, meta);
                throw e;
            }
            if (!exp) {
                const e = new Error("Invalid token payload: missing exp");
                this.logger.warn(`[${this.context}] updateToken invalid payload`, meta);
                throw e;
            }

            const expiredAt = expToDate(exp)

            const created = await this.prisma.session.update({
                where: {
                    id
                },
                data: { userId: sub, refreshToken: token, expiredAt, ip },
            });

            const dto = this.toDto(created);
            this.logger.debug(
                `[${this.context}] updateToken done`,
                { ...meta, userId: sub, expiredAt: expiredAt.toISOString() }
            );
            return dto;
        } catch (err) {
            this.logger.error(`[${this.context}] updateToken failed`, { ...meta, err });
            throw err;
        }
    }
    async findToken(token: string): Promise<RefreshTokenDto | null> {
        const meta = { token };
        try {
            this.logger.debug(`[${this.context}] findToken start`, meta);

            const found = await this.prisma.session.findFirst({ where: { refreshToken: token } });
            if (!found) {
                this.logger.debug(`[${this.context}] findToken not found`, meta);
                return null;
            }

            const dto = this.toDto(found);
            this.logger.debug(`[${this.context}] findToken done`, { meta });
            return dto;
        } catch (err) {
            this.logger.error(`[${this.context}] findToken failed`, { ...meta, err });
            throw err;
        }
    }
    async deleteToken(token: string): Promise<void> {
        const meta = { token };
        try {
            this.logger.debug(`[${this.context}] findToken start`, meta);
            await this.prisma.session.delete({ where: { refreshToken: token } })
            this.logger.debug(`[${this.context}] findToken done`, { ...meta });
        } catch (error) {
            this.logger.error(`[${this.context}] findToken failed`, { ...meta, error });
            throw error
        }
    }
    async removeAllSessionOfUser(userId: string): Promise<void> {
        const meta = { userId }
        try {
            this.logger.debug(`[${this.context}] removeAllSessionOfUser start`, meta);
            await this.prisma.session.deleteMany({ where: { userId} })
            this.logger.debug(`[${this.context}] removeAllSessionOfUser done`, { ...meta });

        } catch (error) {
            this.logger.error(`[${this.context}] removeAllSessionOfUser failed`, { ...meta, error });
            throw error
        }
    }
    async markRefreshTokenUsed(refreshToken: string, sessionId: string): Promise<void> {
        const meta = { refreshToken, sessionId }
        try {
            this.logger.debug(`[${this.context} markRefreshTokenUsed start]`, { ...meta })
            await this.prisma.refreshTokenUsed.create({
                data: {
                    refreshToken, sessionId
                }
            })

            this.logger.debug(`[${this.context} markRefreshTokenUsed done]`, { ...meta })

        } catch (error) {
            this.logger.error(`[${this.context} markRefreshTokenUsed failed]`, { ...meta, error })
            throw error
        }
    }
    async isRefreshTokenUsed(refreshToken: string): Promise<RefreshTokenDto | null> {
        const meta = { refreshToken }
        try {
            this.logger.debug(`[${this.context} isRefreshTokenUsed start]`, { ...meta })
            const refreshTokenUsed = await this.prisma.refreshTokenUsed.findFirst({
                where: {
                    refreshToken
                }
            })
            this.logger.debug(`[${this.context} isRefreshTokenUsed done]`, { ...meta })
            if (!refreshTokenUsed) {
                return null;
            }
            // RefreshTokenUsed doesn't match RefreshTokenDto structure, return null or transform
            return null;

        } catch (error) {
            this.logger.error(`[${this.context} isRefreshTokenUsed failed]`, { ...meta, error })
            throw error
        }
    }


    private safeSignOpts(opts: JwtSignOptions) {
        if (!opts) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secret, privateKey, expiresIn, ...rest } = opts;
        return { ...rest, expiresIn: this.maskExpires(expiresIn) };
    }

    private safeVerifyOpts(opts: JwtVerifyOptions) {
        if (!opts) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secret, publicKey, ...rest } = opts;
        return rest;
    }

    private maskExpires(expiresIn: JwtSignOptions["expiresIn"]) {
        if (expiresIn == null) return undefined;
        return typeof expiresIn === "string" ? expiresIn : `${expiresIn}s`;
    }
}
