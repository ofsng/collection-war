CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"player_id" uuid,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL,
	"account_level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"starter_granted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creature_species" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"content_version" text NOT NULL,
	"name_key" text NOT NULL,
	"description_key" text NOT NULL,
	"element" text NOT NULL,
	"class" text NOT NULL,
	"rarity" text NOT NULL,
	"is_starter" integer DEFAULT 0 NOT NULL,
	"growth" jsonb NOT NULL,
	"art_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"content_version" text NOT NULL,
	"name_key" text NOT NULL,
	"description_key" text NOT NULL,
	"category" text NOT NULL,
	"rarity" text NOT NULL,
	"icon_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species_abilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"species_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name_key" text NOT NULL,
	"kind" text NOT NULL,
	"power_bp" integer NOT NULL,
	"energy_cost" integer DEFAULT 0 NOT NULL,
	"burn_chance_bp" integer DEFAULT 0 NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creature_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"creature_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owned_creatures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"species_id" uuid NOT NULL,
	"nickname" text,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"acquired_via" text NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_version" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"creature_id" uuid NOT NULL,
	"slot" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"node_id" uuid,
	"seed" text NOT NULL,
	"engine_version" text NOT NULL,
	"content_version" text NOT NULL,
	"outcome" text NOT NULL,
	"turn_count" integer NOT NULL,
	"events" jsonb NOT NULL,
	"final_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"idempotency_key" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_inventory" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_inventory_quantity_non_negative" CHECK ("material_inventory"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "player_pve_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"cleared_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pve_nodes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"content_version" text NOT NULL,
	"chapter_slug" text NOT NULL,
	"biome_slug" text NOT NULL,
	"name_key" text NOT NULL,
	"description_key" text NOT NULL,
	"order_index" integer NOT NULL,
	"requires_node_slug" text,
	"opponent_species_id" uuid NOT NULL,
	"opponent_level" integer NOT NULL,
	"rewards" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_abilities" ADD CONSTRAINT "species_abilities_species_id_creature_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."creature_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creature_history" ADD CONSTRAINT "creature_history_creature_id_owned_creatures_id_fk" FOREIGN KEY ("creature_id") REFERENCES "public"."owned_creatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owned_creatures" ADD CONSTRAINT "owned_creatures_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owned_creatures" ADD CONSTRAINT "owned_creatures_species_id_creature_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."creature_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_creature_id_owned_creatures_id_fk" FOREIGN KEY ("creature_id") REFERENCES "public"."owned_creatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_sessions" ADD CONSTRAINT "battle_sessions_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_sessions" ADD CONSTRAINT "battle_sessions_node_id_pve_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."pve_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_material_id_material_definitions_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_material_id_material_definitions_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_pve_progress" ADD CONSTRAINT "player_pve_progress_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_pve_progress" ADD CONSTRAINT "player_pve_progress_node_id_pve_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."pve_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pve_nodes" ADD CONSTRAINT "pve_nodes_opponent_species_id_creature_species_id_fk" FOREIGN KEY ("opponent_species_id") REFERENCES "public"."creature_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "outbox_aggregate_idx" ON "outbox" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "outbox_correlation_idx" ON "outbox" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_key_scope_unique" ON "idempotency_keys" USING btree ("key","scope");--> statement-breakpoint
CREATE INDEX "idempotency_expiry_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idempotency_player_idx" ON "idempotency_keys" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_unique" ON "user_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_family_idx" ON "user_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_user_unique" ON "player_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creature_species_slug_version_unique" ON "creature_species" USING btree ("slug","content_version");--> statement-breakpoint
CREATE INDEX "creature_species_version_idx" ON "creature_species" USING btree ("content_version");--> statement-breakpoint
CREATE UNIQUE INDEX "material_definitions_slug_version_unique" ON "material_definitions" USING btree ("slug","content_version");--> statement-breakpoint
CREATE UNIQUE INDEX "species_abilities_species_slug_unique" ON "species_abilities" USING btree ("species_id","slug");--> statement-breakpoint
CREATE INDEX "species_abilities_species_idx" ON "species_abilities" USING btree ("species_id","order_index");--> statement-breakpoint
CREATE INDEX "creature_history_creature_idx" ON "creature_history" USING btree ("creature_id","occurred_at");--> statement-breakpoint
CREATE INDEX "owned_creatures_player_idx" ON "owned_creatures" USING btree ("player_id") WHERE "owned_creatures"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "owned_creatures_species_idx" ON "owned_creatures" USING btree ("species_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_slot_unique" ON "team_members" USING btree ("team_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_creature_unique" ON "team_members" USING btree ("team_id","creature_id");--> statement-breakpoint
CREATE INDEX "teams_player_idx" ON "teams" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "battle_sessions_player_idx" ON "battle_sessions" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_transactions_player_idx" ON "inventory_transactions" USING btree ("player_id","occurred_at");--> statement-breakpoint
CREATE INDEX "inventory_transactions_source_idx" ON "inventory_transactions" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "material_inventory_player_material_unique" ON "material_inventory" USING btree ("player_id","material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_pve_progress_player_node_unique" ON "player_pve_progress" USING btree ("player_id","node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pve_nodes_slug_version_unique" ON "pve_nodes" USING btree ("slug","content_version");--> statement-breakpoint
CREATE INDEX "pve_nodes_chapter_idx" ON "pve_nodes" USING btree ("chapter_slug","order_index");