-- Generalizing the engine moved artifact ownership out of code and into
-- scenario data -- and left the Atlas scenario with an empty list, so the
-- deterministic handoff that made Júlia produce the manifest simply stopped
-- happening. This seeds it back.
--
-- Only documents that must be REQUESTED belong here. The four already sitting
-- in Arquivos from minute one (AI Usage Policy, Atlas Architecture, Vendor
-- Security Assessment, Pilot Evaluation Report) are public inside the world:
-- listing them would let the possession rule block a character for saying they
-- opened a file anyone can open.

update public.challenge_scenarios
set artifacts = '[
  {
    "name": "Dataset Manifest",
    "ownerId": "julia",
    "keywords": ["manifest", "dataset", "recorte", "tabelas", "campos", "identificadores", "origem dos dados"],
    "body": "DATASET MANIFEST — ATLAS PILOT V3\n\nOrigem: CRM Atendimento\nAmbiente de destino: homologação\nPeríodo do recorte: janeiro a março de 2026\nPipeline: atlas-pilot-v3\nResponsável pela preparação: Júlia Mendes\n\nTabelas de origem:\n- interactions\n- customers\n- tickets\n\nConteúdo documentado:\n- texto das interações de atendimento\n- metadados associados\n\nObservação de validação: o manifest registra o recorte previsto. Quais identificadores pessoais entraram efetivamente no ambiente precisa ser confrontado com o log da execução do pipeline."
  }
]'::jsonb
where key = 'atlas' and (artifacts is null or artifacts = '[]'::jsonb);
