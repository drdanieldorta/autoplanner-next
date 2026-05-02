-- Garantir que cada empresa tenha apenas um registro de credenciais
-- Remove a constraint antiga se existir
ALTER TABLE api_credentials DROP CONSTRAINT IF EXISTS api_credentials_company_id_key;

-- Remove registros duplicados mantendo apenas o mais recente por empresa
DELETE FROM api_credentials a
USING api_credentials b
WHERE a.company_id = b.company_id 
  AND a.created_at < b.created_at;

-- Adiciona constraint única por company_id
ALTER TABLE api_credentials ADD CONSTRAINT api_credentials_company_id_key UNIQUE (company_id);