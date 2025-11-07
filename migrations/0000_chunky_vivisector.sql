CREATE TABLE "food_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"hours" text,
	"distance" text,
	"phone" text,
	"appointment_required" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"hours" text,
	"photo_url" text,
	"submitted_at" timestamp DEFAULT now()
);
