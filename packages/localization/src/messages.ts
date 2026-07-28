import type { CatalogSet } from './catalog';

/**
 * Translations for the TECHNICAL SHELL ONLY.
 *
 * These keys cover the health-check screens, error states and language switcher that
 * exist to prove the platform works. No game content is here, and none should be added
 * until the content model is designed — see
 * docs/specifications/README.md and docs/status/DEFERRED_WORK.md.
 *
 * When real content arrives, these move to versioned catalogue files loaded at build
 * time, and this inline object goes away. It is inline now so that the shells have zero
 * runtime loading machinery to debug.
 *
 * INVARIANT: `en` is the reference catalogue. Every key in `en` must exist in `tr-TR`;
 * `catalog.test.ts` fails the build otherwise.
 */
export const SHELL_MESSAGES: CatalogSet = {
  en: {
    'app.name': 'Collection War',
    'app.tagline': 'Development platform shell',

    'language.label': 'Language',
    'language.tr-TR': 'Türkçe',
    'language.en': 'English',

    'system.title': 'System status',
    'system.description': 'This screen verifies that the client can reach the Collection War API.',
    'system.api.checking': 'Checking API…',
    'system.api.healthy': 'API is healthy',
    'system.api.unhealthy': 'API reported a problem',
    'system.api.unreachable': 'Cannot reach the API',
    'system.api.retry': 'Try again',
    'system.api.endpoint': 'Endpoint',
    'system.api.latency': 'Response time',
    'system.api.version': 'API version',
    'system.api.environment': 'Environment',

    'system.dependency.database': 'Database',
    'system.dependency.redis': 'Cache',
    'system.dependency.up': 'Available',
    'system.dependency.down': 'Unavailable',
    'system.dependency.unknown': 'Unknown',

    'error.boundary.title': 'Something went wrong',
    'error.boundary.description': 'The screen failed to render. This has been logged.',
    'error.boundary.retry': 'Reload',

    'common.loading': 'Loading…',

    'admin.title': 'Collection War Administration',
    'admin.protected.notice':
      'This area requires an authenticated administrator. Authentication is not implemented yet, so no administrative action is available.',

    'notice.no-gameplay': 'This is a platform shell. No gameplay features are implemented yet.',
  },

  'tr-TR': {
    'app.name': 'Collection War',
    'app.tagline': 'Geliştirme platformu iskeleti',

    'language.label': 'Dil',
    'language.tr-TR': 'Türkçe',
    'language.en': 'English',

    'system.title': 'Sistem durumu',
    'system.description': 'Bu ekran, istemcinin Collection War API’sine ulaşabildiğini doğrular.',
    'system.api.checking': 'API kontrol ediliyor…',
    'system.api.healthy': 'API sağlıklı',
    'system.api.unhealthy': 'API bir sorun bildirdi',
    'system.api.unreachable': 'API’ye ulaşılamıyor',
    'system.api.retry': 'Tekrar dene',
    'system.api.endpoint': 'Uç nokta',
    'system.api.latency': 'Yanıt süresi',
    'system.api.version': 'API sürümü',
    'system.api.environment': 'Ortam',

    'system.dependency.database': 'Veritabanı',
    'system.dependency.redis': 'Önbellek',
    'system.dependency.up': 'Erişilebilir',
    'system.dependency.down': 'Erişilemiyor',
    'system.dependency.unknown': 'Bilinmiyor',

    'error.boundary.title': 'Bir şeyler ters gitti',
    'error.boundary.description': 'Ekran görüntülenemedi. Bu hata kaydedildi.',
    'error.boundary.retry': 'Yeniden yükle',

    'common.loading': 'Yükleniyor…',

    'admin.title': 'Collection War Yönetim',
    'admin.protected.notice':
      'Bu alan kimliği doğrulanmış bir yönetici gerektirir. Kimlik doğrulama henüz uygulanmadığı için hiçbir yönetim işlemi kullanılamaz.',

    'notice.no-gameplay': 'Bu bir platform iskeletidir. Henüz hiçbir oyun özelliği uygulanmamıştır.',
  },
};
