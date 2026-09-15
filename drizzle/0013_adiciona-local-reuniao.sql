-- Migration: adiciona coluna location à tabela meetings para placeholder de local.
ALTER TABLE `meetings` ADD `location` text;
