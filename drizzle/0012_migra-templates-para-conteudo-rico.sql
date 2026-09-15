-- Migration: migra templates de ata para conteúdo rico (TipTap JSON)
-- Anterior: header_text/footer_text como texto simples.
-- Novo: header_content/footer_content como JSON do editor TipTap.

ALTER TABLE `minute_templates` ADD `header_content` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL;
ALTER TABLE `minute_templates` ADD `footer_content` text DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}' NOT NULL;

-- Migra textos legados para o formato TipTap básico (parágrafo simples).
UPDATE `minute_templates`
SET `header_content` = json_object(
  'type', 'doc',
  'content', json_array(
    json_object(
      'type', 'paragraph',
      'content', CASE WHEN `header_text` IS NULL OR `header_text` = '' THEN NULL ELSE json_array(json_object('type', 'text', 'text', `header_text`)) END
    )
  )
)
WHERE `header_text` IS NOT NULL AND `header_text` <> '';

UPDATE `minute_templates`
SET `footer_content` = json_object(
  'type', 'doc',
  'content', json_array(
    json_object(
      'type', 'paragraph',
      'content', CASE WHEN `footer_text` IS NULL OR `footer_text` = '' THEN NULL ELSE json_array(json_object('type', 'text', 'text', `footer_text`)) END
    )
  )
)
WHERE `footer_text` IS NOT NULL AND `footer_text` <> '';

ALTER TABLE `minute_templates` DROP COLUMN `header_text`;
ALTER TABLE `minute_templates` DROP COLUMN `footer_text`;
