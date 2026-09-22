-- Nome atual da marca. Só troca quem ainda tem o nome antigo de fábrica:
-- se o titular já renomeou a licença ou a equipe, fica como ele deixou.
UPDATE "licencas" SET "nome" = 'DR Perícias Trabalhista' WHERE "nome" = 'D&R Perícia Elite';
UPDATE "organizacoes" SET "nome" = 'DR Perícias Trabalhista' WHERE "nome" = 'D&R Perícia Elite';
