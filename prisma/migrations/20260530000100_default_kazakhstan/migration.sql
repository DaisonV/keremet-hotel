UPDATE "Hotel"
SET "country" = 'KZ'
WHERE "country" = 'KG';

UPDATE "Hotel"
SET "timezone" = 'Asia/Almaty'
WHERE "timezone" = 'Asia/Bishkek';

UPDATE "Hotel"
SET "currency" = 'KZT'
WHERE "currency" = 'KGS';

ALTER TABLE "Hotel" ALTER COLUMN "country" SET DEFAULT 'KZ';
ALTER TABLE "Hotel" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Almaty';
ALTER TABLE "Hotel" ALTER COLUMN "currency" SET DEFAULT 'KZT';
