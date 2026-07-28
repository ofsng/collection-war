import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SUPPORTED_LOCALES } from '@collection-war/shared-types';
import type { ApiConfig } from '@collection-war/configuration';
import { TOKENS } from '../tokens';

/**
 * System information.
 *
 * The only endpoint under `/api/v1` at bootstrap. It exists so a client can confirm it is
 * talking to the API it expects, in the environment it expects, with the locales it
 * expects.
 *
 * WHAT IT DELIBERATELY DOES NOT RETURN: dependency versions, hostnames, build paths,
 * commit hashes, feature-flag values, or any configuration. Each of those is free
 * reconnaissance for an attacker, and none of them helps a legitimate client.
 */
@ApiTags('system')
@Controller('api/v1/system')
export class SystemController {
  constructor(@Inject(TOKENS.CONFIG) private readonly config: ApiConfig) {}

  @Get('info')
  @ApiOperation({ summary: 'Non-sensitive service identity and capabilities.' })
  info() {
    return {
      name: 'collection-war-api' as const,
      apiVersion: 'v1',
      environment: this.config.COLLECTION_WAR_ENV,
      supportedLocales: SUPPORTED_LOCALES,
    };
  }
}
