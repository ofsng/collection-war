import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { displayNameSchema, localeSchema } from '@collection-war/validation';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { parseBody, unwrapOrThrow } from '../common/http';

const registerSchema = z.object({
  email: z.string().email().max(254),
  // Length over composition rules: length is what actually resists guessing.
  password: z.string().min(10).max(200),
  displayName: displayNameSchema,
  locale: localeSchema.optional(),
});

const loginSchema = z.object({
  email: z.string().max(254),
  password: z.string().max(200),
});

const refreshSchema = z.object({ refreshToken: z.string().min(10).max(500) });

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account and its player profile.' })
  async register(@Body() body: unknown) {
    const input = parseBody(registerSchema, body);

    return unwrapOrThrow(
      await this.auth.register(input.email, input.password, input.displayName, input.locale),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for tokens.' })
  async login(@Body() body: unknown) {
    const input = parseBody(loginSchema, body);

    return unwrapOrThrow(await this.auth.login(input.email, input.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token. Reuse revokes the whole family.' })
  async refresh(@Body() body: unknown) {
    const input = parseBody(refreshSchema, body);

    return unwrapOrThrow(await this.auth.refresh(input.refreshToken));
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token.' })
  async logout(@Body() body: unknown, @Req() _request: unknown): Promise<void> {
    const input = parseBody(refreshSchema, body);
    await this.auth.logout(input.refreshToken);
  }
}
