-- Migration: ciclo de vida da reunião passa de Rascunho/Em andamento/
-- Finalizada/Reaberta para Aberta/Encerrada (ADR-0021).
-- Remapeia os valores antigos: draft|in_progress|reopened -> open;
-- finished -> closed. Geração da ata encerra a reunião a partir de agora.
--
-- Não recriamos a tabela `meetings` (rebuild do drizzle) porque o D1 executa
-- cada migração em transação e `PRAGMA foreign_keys=OFF` é no-op dentro dela:
-- o DROP TABLE falha por FK das 7 tabelas filhas. Por isso o default físico da
-- coluna continua `'draft'`; a aplicação sempre grava `status` explicitamente
-- (createMeeting/createMeetingWithRelations), então o default antigo nunca é
-- usado. Ver também AGENTS.md > Gotchas e ADR-0021 (divergência conhecida).

UPDATE `meetings`
SET `status` = CASE
	WHEN `status` IN ('draft', 'in_progress', 'reopened') THEN 'open'
	WHEN `status` = 'finished' THEN 'closed'
	ELSE `status`
END;
