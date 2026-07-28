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

    // ── Authentication ───────────────────────────────────────────────────
    'auth.register.title': 'Create an account',
    'auth.login.title': 'Sign in',
    'auth.field.displayName': 'Display name',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.field.password.hint': 'At least 10 characters. Length matters more than symbols.',
    'auth.register.submit': 'Create account',
    'auth.login.submit': 'Sign in',
    'auth.switch.toLogin': 'I already have an account',
    'auth.switch.toRegister': 'I need an account',
    'auth.signOut': 'Sign out',
    'auth.error.register': 'Registration could not be completed. Check your details and try again.',
    'auth.error.login': 'Invalid email or password.',

    // ── Game ─────────────────────────────────────────────────────────────
    'game.starter.title': 'Choose your first creature',
    'game.starter.description': 'This choice is permanent. Each starter plays differently.',
    'game.starter.choose': 'Choose',
    'game.collection.title': 'Your collection',
    'game.creature.level': 'Level',
    'game.creature.experience': 'Experience',
    'game.creature.health': 'Health',
    'game.creature.attack': 'Attack',
    'game.creature.defense': 'Defense',
    'game.creature.speed': 'Speed',
    'game.creature.levelUp': 'Level up',
    'game.team.set': 'Add to team',
    'game.team.inTeam': 'In team',
    'game.team.notInTeam': 'Not in team',
    'game.pve.title': 'Crimson Rift',
    'game.pve.fight': 'Fight',
    'game.pve.locked': 'Locked',
    'game.pve.cleared': 'Cleared',
    'game.pve.opponentLevel': 'Opponent level',
    'game.battle.result': 'Battle result',
    'game.battle.victory': 'Victory',
    'game.battle.defeat': 'Defeat',
    'game.battle.turns': 'Turns',
    'game.battle.experience': 'Experience gained',
    'game.battle.materials': 'Materials found',
    'game.battle.seed': 'Seed',
    'game.battle.log': 'Battle log',
    'game.inventory.title': 'Materials',
    'game.inventory.empty': 'No materials yet. Win a battle to find some.',
    'game.error.starter': 'Could not grant a starter. You may already have one.',
    'game.error.battle': 'The battle could not be started.',
    'game.error.levelUp': 'Could not level up. Check experience and materials.',

    // ── Elements and classes ─────────────────────────────────────────────
    'element.FIRE': 'Fire',
    'element.WATER': 'Water',
    'element.EARTH': 'Earth',
    'element.AIR': 'Air',
    'element.ELECTRIC': 'Electric',
    'element.NATURE': 'Nature',
    'element.LIGHT': 'Light',
    'element.SHADOW': 'Shadow',
    'class.GUARDIAN': 'Guardian',
    'class.HUNTER': 'Hunter',
    'class.RAIDER': 'Raider',
    'class.HEALER': 'Healer',
    'class.CONTROLLER': 'Controller',
    'class.BINDER': 'Binder',

    // ── Content: species ─────────────────────────────────────────────────
    'species.koruk.name': 'Koruk',
    'species.koruk.description': 'A patient ember-shelled guardian. Slow, but very hard to break.',
    'species.mizu.name': 'Mizu',
    'species.mizu.description': 'A tidewater healer. Outlasts opponents rather than out-hitting them.',
    'species.veyra.name': 'Veyra',
    'species.veyra.description': 'A storm-born raider. Strikes first, strikes hard, falls quickly.',
    'species.cinder-sprout.name': 'Cinder Sprout',
    'species.cinder-sprout.description': 'A restless seedling from the rift edge.',

    // ── Content: abilities ───────────────────────────────────────────────
    'ability.ember-strike.name': 'Ember Strike',
    'ability.molten-guard.name': 'Molten Guard',
    'ability.cinder-crush.name': 'Cinder Crush',
    'ability.tide-slap.name': 'Tide Slap',
    'ability.restoring-current.name': 'Restoring Current',
    'ability.pressure-burst.name': 'Pressure Burst',
    'ability.gale-cut.name': 'Gale Cut',
    'ability.updraft.name': 'Updraft',
    'ability.storm-lash.name': 'Storm Lash',
    'ability.thorn-jab.name': 'Thorn Jab',

    // ── Content: materials ───────────────────────────────────────────────
    'material.ember-seed.name': 'Ember Seed',
    'material.ember-seed.description': 'A seed that never quite stops smouldering.',
    'material.fire-essence.name': 'Fire Essence',
    'material.fire-essence.description': 'Distilled heat from the deep rift.',
    'material.magma-shell.name': 'Magma Shell',
    'material.magma-shell.description': 'Cooled armour plating, still warm to the touch.',
    'material.volcanic-glass.name': 'Volcanic Glass',
    'material.volcanic-glass.description': 'Sharp, dark and prized by crafters.',

    // ── Content: PvE ─────────────────────────────────────────────────────
    'pve.crimson-rift-1-1.name': 'Scorched Approach',
    'pve.crimson-rift-1-1.description': 'The outermost edge of the rift. Something small is watching.',
    'pve.crimson-rift-1-2.name': 'Ashfall Path',
    'pve.crimson-rift-1-2.description': 'Falling ash hides what moves between the rocks.',
    'pve.crimson-rift-1-3.name': 'Ember Hollow',
    'pve.crimson-rift-1-3.description': 'A hollow where the heat gathers, and so does everything else.',

    // ── Errors ───────────────────────────────────────────────────────────
    'error.registration_failed': 'Registration could not be completed.',
    'error.invalid_credentials': 'Invalid email or password.',
    'error.session_expired': 'Your session has expired. Please sign in again.',
    'error.starter_already_granted': 'You already have a starter creature.',
    'error.no_team': 'Set up a team before fighting.',
    'error.insufficient_funds': 'Not enough currency.',
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

    // ── Kimlik doğrulama ─────────────────────────────────────────────────
    'auth.register.title': 'Hesap oluştur',
    'auth.login.title': 'Giriş yap',
    'auth.field.displayName': 'Görünen ad',
    'auth.field.email': 'E-posta',
    'auth.field.password': 'Parola',
    'auth.field.password.hint': 'En az 10 karakter. Uzunluk, simgelerden daha önemlidir.',
    'auth.register.submit': 'Hesap oluştur',
    'auth.login.submit': 'Giriş yap',
    'auth.switch.toLogin': 'Zaten hesabım var',
    'auth.switch.toRegister': 'Hesap oluşturmak istiyorum',
    'auth.signOut': 'Çıkış yap',
    'auth.error.register': 'Kayıt tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.',
    'auth.error.login': 'E-posta veya parola hatalı.',

    // ── Oyun ─────────────────────────────────────────────────────────────
    'game.starter.title': 'İlk yaratığını seç',
    'game.starter.description': 'Bu seçim kalıcıdır. Her başlangıç yaratığı farklı oynanır.',
    'game.starter.choose': 'Seç',
    'game.collection.title': 'Koleksiyonun',
    'game.creature.level': 'Seviye',
    'game.creature.experience': 'Deneyim',
    'game.creature.health': 'Can',
    'game.creature.attack': 'Saldırı',
    'game.creature.defense': 'Savunma',
    'game.creature.speed': 'Hız',
    'game.creature.levelUp': 'Seviye atla',
    'game.team.set': 'Takıma ekle',
    'game.team.inTeam': 'Takımda',
    'game.team.notInTeam': 'Takımda değil',
    'game.pve.title': 'Kızıl Yarık',
    'game.pve.fight': 'Savaş',
    'game.pve.locked': 'Kilitli',
    'game.pve.cleared': 'Tamamlandı',
    'game.pve.opponentLevel': 'Rakip seviyesi',
    'game.battle.result': 'Savaş sonucu',
    'game.battle.victory': 'Zafer',
    'game.battle.defeat': 'Yenilgi',
    'game.battle.turns': 'Tur',
    'game.battle.experience': 'Kazanılan deneyim',
    'game.battle.materials': 'Bulunan malzemeler',
    'game.battle.seed': 'Tohum',
    'game.battle.log': 'Savaş kaydı',
    'game.inventory.title': 'Malzemeler',
    'game.inventory.empty': 'Henüz malzeme yok. Bir savaş kazanarak malzeme bulabilirsin.',
    'game.error.starter': 'Başlangıç yaratığı verilemedi. Zaten bir tane almış olabilirsin.',
    'game.error.battle': 'Savaş başlatılamadı.',
    'game.error.levelUp': 'Seviye atlanamadı. Deneyim ve malzemeleri kontrol et.',

    // ── Elementler ve sınıflar ───────────────────────────────────────────
    'element.FIRE': 'Ateş',
    'element.WATER': 'Su',
    'element.EARTH': 'Toprak',
    'element.AIR': 'Hava',
    'element.ELECTRIC': 'Elektrik',
    'element.NATURE': 'Doğa',
    'element.LIGHT': 'Işık',
    'element.SHADOW': 'Gölge',
    'class.GUARDIAN': 'Koruyucu',
    'class.HUNTER': 'Avcı',
    'class.RAIDER': 'Akıncı',
    'class.HEALER': 'Şifacı',
    'class.CONTROLLER': 'Denetleyici',
    'class.BINDER': 'Bağlayıcı',

    // ── İçerik: türler ───────────────────────────────────────────────────
    'species.koruk.name': 'Koruk',
    'species.koruk.description': 'Sabırlı, köz kabuklu bir koruyucu. Yavaştır ama kırılması çok zordur.',
    'species.mizu.name': 'Mizu',
    'species.mizu.description': 'Gelgit sularının şifacısı. Rakibini vurarak değil, dayanarak yener.',
    'species.veyra.name': 'Veyra',
    'species.veyra.description': 'Fırtınadan doğan bir akıncı. Önce vurur, sert vurur, çabuk düşer.',
    'species.cinder-sprout.name': 'Köz Filizi',
    'species.cinder-sprout.description': 'Yarığın kıyısından gelen huzursuz bir fide.',

    // ── İçerik: yetenekler ───────────────────────────────────────────────
    'ability.ember-strike.name': 'Köz Vuruşu',
    'ability.molten-guard.name': 'Erimiş Kalkan',
    'ability.cinder-crush.name': 'Köz Ezişi',
    'ability.tide-slap.name': 'Gelgit Şamarı',
    'ability.restoring-current.name': 'Onarıcı Akıntı',
    'ability.pressure-burst.name': 'Basınç Patlaması',
    'ability.gale-cut.name': 'Bora Kesiği',
    'ability.updraft.name': 'Yükselen Akım',
    'ability.storm-lash.name': 'Fırtına Kırbacı',
    'ability.thorn-jab.name': 'Diken Dürtüsü',

    // ── İçerik: malzemeler ───────────────────────────────────────────────
    'material.ember-seed.name': 'Köz Tohumu',
    'material.ember-seed.description': 'Için için yanmayı hiç bırakmayan bir tohum.',
    'material.fire-essence.name': 'Ateş Özü',
    'material.fire-essence.description': 'Derin yarıktan damıtılmış ısı.',
    'material.magma-shell.name': 'Magma Kabuğu',
    'material.magma-shell.description': 'Soğumuş zırh plakası, dokunulduğunda hâlâ ılık.',
    'material.volcanic-glass.name': 'Volkanik Cam',
    'material.volcanic-glass.description': 'Keskin, koyu ve zanaatkârların gözdesi.',

    // ── İçerik: PvE ──────────────────────────────────────────────────────
    'pve.crimson-rift-1-1.name': 'Kavrulmuş Geçit',
    'pve.crimson-rift-1-1.description': 'Yarığın en dış kenarı. Küçük bir şey seni izliyor.',
    'pve.crimson-rift-1-2.name': 'Kül Yağmuru Yolu',
    'pve.crimson-rift-1-2.description': 'Yağan kül, kayaların arasında hareket edeni gizliyor.',
    'pve.crimson-rift-1-3.name': 'Köz Oyuğu',
    'pve.crimson-rift-1-3.description': 'Isının toplandığı bir oyuk; başka her şeyin de.',

    // ── Hatalar ──────────────────────────────────────────────────────────
    'error.registration_failed': 'Kayıt tamamlanamadı.',
    'error.invalid_credentials': 'E-posta veya parola hatalı.',
    'error.session_expired': 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
    'error.starter_already_granted': 'Zaten bir başlangıç yaratığın var.',
    'error.no_team': 'Savaşmadan önce bir takım oluştur.',
    'error.insufficient_funds': 'Yeterli para birimi yok.',
  },
};
