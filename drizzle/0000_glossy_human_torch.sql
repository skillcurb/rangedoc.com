CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('PAGE_VIEW','SEARCH','SEARCH_IMPRESSION','SEARCH_CLICK','PROFILE_VIEW','APPOINTMENT_CLICK','APPOINTMENT_SUBMIT','CALL_CLICK','EMAIL_CLICK','EMAIL_SUBMIT','WEBSITE_CLICK','GALLERY_VIEW','PHOTO_VIEW','SHARE_CLICK','SAVE_CLICK','DIRECTIONS_CLICK','PRODUCT_VIEW','ADD_TO_CART','BLOG_VIEW') NOT NULL,
	`visitor_id` varchar(64),
	`session_id` varchar(64),
	`provider_id` int,
	`path` varchar(500),
	`referrer` varchar(500),
	`device` varchar(30),
	`browser` varchar(60),
	`os` varchar(60),
	`country` varchar(80),
	`city` varchar(120),
	`meta` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`location_id` int,
	`date` date NOT NULL,
	`time_slot` varchar(20) NOT NULL,
	`first_name` varchar(191) NOT NULL,
	`last_name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`date_of_birth` varchar(20),
	`is_new_patient` boolean NOT NULL DEFAULT true,
	`insurance` varchar(191),
	`reason` text,
	`preferred_contact` varchar(20),
	`status` enum('NEW','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'NEW',
	`provider_note` text,
	`visitor_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `appointment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	CONSTRAINT `blog_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`body` text NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `blog_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_tags` (
	`post_id` int NOT NULL,
	`tag_id` int NOT NULL,
	CONSTRAINT `blog_post_tags_post_id_tag_id_pk` PRIMARY KEY(`post_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`excerpt` text,
	`content` longtext NOT NULL,
	`cover_image` varchar(191),
	`cover_alt` varchar(191),
	`author_name` varchar(191),
	`author_avatar` varchar(191),
	`category_id` int,
	`published` boolean NOT NULL DEFAULT false,
	`published_at` datetime(3),
	`featured` boolean NOT NULL DEFAULT false,
	`reading_minutes` int,
	`views` int NOT NULL DEFAULT 0,
	`rating_sum` int NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`visitor_id` varchar(64) NOT NULL,
	`rating` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `blog_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_ratings_post_id_visitor_id_key` UNIQUE(`post_id`,`visitor_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	CONSTRAINT `blog_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`state` varchar(191) NOT NULL,
	`state_code` varchar(10) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`zip_codes` text,
	`image` varchar(191),
	`description` text,
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cms_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`excerpt` text,
	`content` longtext NOT NULL,
	`hero_image` varchar(191),
	`published` boolean NOT NULL DEFAULT true,
	`footer_group` varchar(40),
	`sort_order` int NOT NULL DEFAULT 0,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `cms_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `cms_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`short_name` varchar(60),
	`description` text,
	`image` varchar(191),
	`keywords` text,
	`show_on_home` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	CONSTRAINT `conditions_id` PRIMARY KEY(`id`),
	CONSTRAINT `conditions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40),
	`subject` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section` varchar(60) NOT NULL,
	`icon` varchar(60),
	`title` varchar(191) NOT NULL,
	`text` text,
	`link` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `content_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`url` varchar(191) NOT NULL,
	`alt` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `gallery_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insurances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`logo` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `insurances_id` PRIMARY KEY(`id`),
	CONSTRAINT `insurances_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(191) NOT NULL,
	`original_name` varchar(191) NOT NULL,
	`url` varchar(191) NOT NULL,
	`path` varchar(191) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`width` int,
	`height` int,
	`alt` varchar(191),
	`title` varchar(191),
	`folder` varchar(191) NOT NULL DEFAULT 'media',
	`uploaded_by_id` int,
	`provider_id` int,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`name` varchar(191) NOT NULL,
	`image` varchar(191),
	`price_cents` int NOT NULL,
	`quantity` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(191) NOT NULL,
	`customer_name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40),
	`address1` varchar(191) NOT NULL,
	`address2` varchar(191),
	`city` varchar(191) NOT NULL,
	`state` varchar(191) NOT NULL,
	`zip` varchar(20) NOT NULL,
	`country` varchar(191) NOT NULL DEFAULT 'US',
	`notes` text,
	`subtotal_cents` int NOT NULL,
	`shipping_cents` int NOT NULL DEFAULT 0,
	`tax_cents` int NOT NULL DEFAULT 0,
	`total_cents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`status` enum('PENDING','PAID','PROCESSING','SHIPPED','COMPLETED','CANCELLED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
	`payment_method` varchar(30) NOT NULL,
	`payment_ref` varchar(191),
	`paid_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `page_seo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_key` varchar(60) NOT NULL,
	`label` varchar(191) NOT NULL,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_title` varchar(255),
	`og_description` varchar(500),
	`og_image` varchar(191),
	`canonical` varchar(191),
	`no_index` boolean NOT NULL DEFAULT false,
	CONSTRAINT `page_seo_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_seo_pageKey_unique` UNIQUE(`page_key`)
);
--> statement-breakpoint
CREATE TABLE `plan_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(191) NOT NULL,
	`provider_id` int,
	`user_id` int,
	`plan_id` int NOT NULL,
	`amount_cents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`status` enum('PENDING','PAID','PROCESSING','SHIPPED','COMPLETED','CANCELLED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
	`payment_method` varchar(30) NOT NULL,
	`payment_ref` varchar(191),
	`billing_name` varchar(191) NOT NULL,
	`billing_email` varchar(191) NOT NULL,
	`billing_phone` varchar(40),
	`billing_address` varchar(191),
	`paid_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `plan_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_orders_orderNumber_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`tagline` varchar(191),
	`price_cents` int NOT NULL DEFAULT 0,
	`interval` enum('MONTH','YEAR','LIFETIME') NOT NULL DEFAULT 'MONTH',
	`is_free` boolean NOT NULL DEFAULT false,
	`is_popular` boolean NOT NULL DEFAULT false,
	`badge` varchar(40),
	`price_note` varchar(60),
	`cta_label` varchar(60),
	`features` json,
	`max_photos` int NOT NULL DEFAULT 4,
	`max_locations` int NOT NULL DEFAULT 1,
	`max_faqs` int NOT NULL DEFAULT 3,
	`allow_reviews` boolean NOT NULL DEFAULT false,
	`allow_share_save` boolean NOT NULL DEFAULT false,
	`allow_rating_display` boolean NOT NULL DEFAULT false,
	`allow_video` boolean NOT NULL DEFAULT false,
	`max_videos` int NOT NULL DEFAULT 0,
	`allow_social_links` boolean NOT NULL DEFAULT false,
	`allow_analytics` boolean NOT NULL DEFAULT false,
	`allow_all_faqs` boolean NOT NULL DEFAULT false,
	`featured_badge` boolean NOT NULL DEFAULT false,
	`search_priority` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `popular_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(191) NOT NULL,
	`provider_type` enum('PHYSICAL_THERAPIST','CHIROPRACTOR'),
	`condition_id` int,
	`specialty_id` int,
	`query` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `popular_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`icon` varchar(60),
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`short_description` varchar(500),
	`description` text,
	`price_cents` int NOT NULL,
	`compare_at_cents` int,
	`image` varchar(191),
	`images` json,
	`sku` varchar(80),
	`stock` int,
	`brand` varchar(191),
	`product_type` varchar(80),
	`use_cases` varchar(255),
	`category_id` int,
	`active` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `provider_conditions` (
	`provider_id` int NOT NULL,
	`condition_id` int NOT NULL,
	CONSTRAINT `provider_conditions_provider_id_condition_id_pk` PRIMARY KEY(`provider_id`,`condition_id`)
);
--> statement-breakpoint
CREATE TABLE `provider_faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`question` varchar(500) NOT NULL,
	`answer` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `provider_faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_insurances` (
	`provider_id` int NOT NULL,
	`insurance_id` int NOT NULL,
	CONSTRAINT `provider_insurances_provider_id_insurance_id_pk` PRIMARY KEY(`provider_id`,`insurance_id`)
);
--> statement-breakpoint
CREATE TABLE `provider_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`address` varchar(191) NOT NULL,
	`address2` varchar(191),
	`city_id` int,
	`city_name` varchar(191) NOT NULL,
	`state` varchar(40) NOT NULL,
	`zip` varchar(20) NOT NULL,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`phone` varchar(40),
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `provider_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`contact` varchar(191) NOT NULL,
	`subject` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`visitor_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `provider_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_specialties` (
	`provider_id` int NOT NULL,
	`specialty_id` int NOT NULL,
	CONSTRAINT `provider_specialties_provider_id_specialty_id_pk` PRIMARY KEY(`provider_id`,`specialty_id`)
);
--> statement-breakpoint
CREATE TABLE `provider_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`title` varchar(191) NOT NULL,
	`url` varchar(191) NOT NULL,
	`thumbnail` varchar(191),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `provider_videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(191) NOT NULL,
	`prefix` varchar(20),
	`first_name` varchar(191) NOT NULL,
	`last_name` varchar(191) NOT NULL,
	`credentials` varchar(80),
	`provider_type` enum('PHYSICAL_THERAPIST','CHIROPRACTOR') NOT NULL,
	`headline` varchar(160),
	`practice_name` varchar(191),
	`bio` text,
	`quote` varchar(500),
	`best_match` text,
	`best_match_points` text,
	`photo` varchar(191),
	`video_url` varchar(191),
	`facebook_url` varchar(191),
	`x_url` varchar(191),
	`linkedin_url` varchar(191),
	`pinterest_url` varchar(191),
	`youtube_url` varchar(191),
	`instagram_url` varchar(191),
	`gender` varchar(30),
	`languages` varchar(255),
	`education` varchar(191),
	`years_experience` int,
	`license_number` varchar(80),
	`license_state` varchar(40),
	`license_verified` boolean NOT NULL DEFAULT false,
	`claim_status` enum('UNCLAIMED','PENDING','CLAIMED') NOT NULL DEFAULT 'UNCLAIMED',
	`claim_note` text,
	`claimed_at` datetime(3),
	`status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
	`phone` varchar(40),
	`email` varchar(191),
	`website` varchar(191),
	`accepting_new_patients` boolean NOT NULL DEFAULT true,
	`in_person` boolean NOT NULL DEFAULT true,
	`telehealth` boolean NOT NULL DEFAULT false,
	`response_time` varchar(120),
	`office_hours` json,
	`slot_minutes` int NOT NULL DEFAULT 30,
	`display_rating` double,
	`display_review_count` int,
	`rating_source` varchar(60),
	`endorsement` varchar(255),
	`featured` boolean NOT NULL DEFAULT false,
	`featured_order` int NOT NULL DEFAULT 0,
	`plan_id` int,
	`plan_expires_at` datetime(3),
	`city_id` int,
	`meta_title` varchar(255),
	`meta_description` varchar(500),
	`meta_keywords` varchar(500),
	`og_image` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `providers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`author_name` varchar(191) NOT NULL,
	`author_email` varchar(191),
	`rating` int NOT NULL,
	`title` varchar(191),
	`body` text NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`visitor_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(80) NOT NULL,
	`value` json NOT NULL,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `specialties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `specialties_id` PRIMARY KEY(`id`),
	CONSTRAINT `specialties_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`role` varchar(191),
	`location` varchar(191),
	`avatar` varchar(191),
	`quote` text NOT NULL,
	`rating` int NOT NULL DEFAULT 5,
	`page` varchar(40) NOT NULL DEFAULT 'claim',
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(191) NOT NULL,
	`role` enum('ADMIN','PROVIDER') NOT NULL DEFAULT 'PROVIDER',
	`avatar` varchar(191),
	`provider_id` int,
	`google_id` varchar(191),
	`facebook_id` varchar(191),
	`reset_token` varchar(191),
	`reset_token_expires` datetime(3),
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_providerId_unique` UNIQUE(`provider_id`),
	CONSTRAINT `users_googleId_unique` UNIQUE(`google_id`),
	CONSTRAINT `users_facebookId_unique` UNIQUE(`facebook_id`),
	CONSTRAINT `users_resetToken_unique` UNIQUE(`reset_token`)
);
--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` varchar(64) NOT NULL,
	`first_seen_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`visit_count` int NOT NULL DEFAULT 1,
	`page_views` int NOT NULL DEFAULT 0,
	`last_session_id` varchar(64),
	`device` varchar(30),
	`browser` varchar(60),
	`os` varchar(60),
	`country` varchar(80),
	`region` varchar(80),
	`city` varchar(120),
	`lat` double,
	`lng` double,
	`referrer` varchar(500),
	CONSTRAINT `visitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_visitor_id_visitors_id_fk` FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD CONSTRAINT `appointment_requests_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_tag_id_blog_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `blog_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_category_id_blog_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_ratings` ADD CONSTRAINT `blog_ratings_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gallery_images` ADD CONSTRAINT `gallery_images_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_uploaded_by_id_users_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_orders` ADD CONSTRAINT `plan_orders_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_orders` ADD CONSTRAINT `plan_orders_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `popular_searches` ADD CONSTRAINT `popular_searches_condition_id_conditions_id_fk` FOREIGN KEY (`condition_id`) REFERENCES `conditions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `popular_searches` ADD CONSTRAINT `popular_searches_specialty_id_specialties_id_fk` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_conditions` ADD CONSTRAINT `provider_conditions_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_conditions` ADD CONSTRAINT `provider_conditions_condition_id_conditions_id_fk` FOREIGN KEY (`condition_id`) REFERENCES `conditions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_faqs` ADD CONSTRAINT `provider_faqs_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_insurances` ADD CONSTRAINT `provider_insurances_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_insurances` ADD CONSTRAINT `provider_insurances_insurance_id_insurances_id_fk` FOREIGN KEY (`insurance_id`) REFERENCES `insurances`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_locations` ADD CONSTRAINT `provider_locations_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_locations` ADD CONSTRAINT `provider_locations_city_id_cities_id_fk` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_messages` ADD CONSTRAINT `provider_messages_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_specialties` ADD CONSTRAINT `provider_specialties_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_specialties` ADD CONSTRAINT `provider_specialties_specialty_id_specialties_id_fk` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_videos` ADD CONSTRAINT `provider_videos_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providers` ADD CONSTRAINT `providers_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providers` ADD CONSTRAINT `providers_city_id_cities_id_fk` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_provider_id_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `analytics_events_type_created_at_idx` ON `analytics_events` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_provider_id_type_created_at_idx` ON `analytics_events` (`provider_id`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_visitor_id_idx` ON `analytics_events` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `analytics_events_created_at_idx` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `appointment_requests_provider_id_date_idx` ON `appointment_requests` (`provider_id`,`date`);--> statement-breakpoint
CREATE INDEX `blog_comments_post_id_status_idx` ON `blog_comments` (`post_id`,`status`);--> statement-breakpoint
CREATE INDEX `blog_post_tags_tag_id_idx` ON `blog_post_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `blog_posts_published_published_at_idx` ON `blog_posts` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `content_blocks_section_idx` ON `content_blocks` (`section`);--> statement-breakpoint
CREATE INDEX `gallery_images_provider_id_idx` ON `gallery_images` (`provider_id`);--> statement-breakpoint
CREATE INDEX `media_folder_idx` ON `media` (`folder`);--> statement-breakpoint
CREATE INDEX `media_mime_type_idx` ON `media` (`mime_type`);--> statement-breakpoint
CREATE INDEX `provider_conditions_condition_id_idx` ON `provider_conditions` (`condition_id`);--> statement-breakpoint
CREATE INDEX `provider_faqs_provider_id_idx` ON `provider_faqs` (`provider_id`);--> statement-breakpoint
CREATE INDEX `provider_insurances_insurance_id_idx` ON `provider_insurances` (`insurance_id`);--> statement-breakpoint
CREATE INDEX `provider_locations_provider_id_idx` ON `provider_locations` (`provider_id`);--> statement-breakpoint
CREATE INDEX `provider_locations_lat_lng_idx` ON `provider_locations` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `provider_messages_provider_id_created_at_idx` ON `provider_messages` (`provider_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `provider_specialties_specialty_id_idx` ON `provider_specialties` (`specialty_id`);--> statement-breakpoint
CREATE INDEX `provider_videos_provider_id_idx` ON `provider_videos` (`provider_id`);--> statement-breakpoint
CREATE INDEX `providers_provider_type_idx` ON `providers` (`provider_type`);--> statement-breakpoint
CREATE INDEX `providers_city_id_idx` ON `providers` (`city_id`);--> statement-breakpoint
CREATE INDEX `providers_claim_status_idx` ON `providers` (`claim_status`);--> statement-breakpoint
CREATE INDEX `providers_featured_idx` ON `providers` (`featured`);--> statement-breakpoint
CREATE INDEX `reviews_provider_id_status_idx` ON `reviews` (`provider_id`,`status`);--> statement-breakpoint
CREATE INDEX `visitors_last_seen_at_idx` ON `visitors` (`last_seen_at`);