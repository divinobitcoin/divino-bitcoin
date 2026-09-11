# Ativos oficiais da marca Divino Bitcoin

Os arquivos desta pasta são fontes vetoriais oficiais. Use-os diretamente; não
os redesenhe, não os reconstrua de capturas e não peça a um gerador de imagens
que “faça algo parecido”.

## Ativos

| Arquivo | Uso |
|---|---|
| [`assets/divino-bitcoin-simbolo-b-gold.svg`](assets/divino-bitcoin-simbolo-b-gold.svg) | Avatar, favicon, selo pequeno e situações em que o nome já está visível |
| [`assets/divino-bitcoin-assinatura-primary-color.svg`](assets/divino-bitcoin-assinatura-primary-color.svg) | Assinatura horizontal principal, abertura/encerramento e peças institucionais |

O símbolo é o **B — Nó Soberano**: halo circular aberto, dois nós superiores,
um nó inferior e um núcleo losangular. Ele não é o logotipo tradicional do
Bitcoin, não é um pentágono de rede e não deve receber traços extras.

## Regras de integridade

- Preserve o `viewBox` e a proporção.
- Escale uniformemente; nunca estique em um eixo.
- Não mova, retire ou acrescente nós.
- Não feche o halo aberto.
- Não gire, incline, aplique perspectiva ou morph.
- Não substitua `#F2A900` por `#F7931A`.
- Não aplique sombra, bevel, neon, contorno ou gradiente ao arquivo mestre.
- Em vídeo, a assinatura final é estática; fade simples é permitido.
- Se precisar de versão monocromática ou negativa, derive de modo determinístico
  e documente a transformação; o mestre permanece inalterado.

## Fundo e contraste

A versão primária foi desenhada para fundo `#080909` ou `#121518`. O ouro do
símbolo é `#F2A900` e o nome na assinatura é `#F4F2EA`. Não use sobre fotografia
ruidosa sem uma área sólida de proteção.

## Exportação

Para raster, parta sempre do SVG e exporte no tamanho final ou maior. Preserve
transparência quando a composição fornece o fundo. Um PNG capturado de vídeo é
uma prévia, não uma nova fonte oficial.

## Verificação

Antes de usar, compare checksum, dimensões e renderização. Este comando registra
os hashes da versão presente no checkout:

```sh
sha256sum docs/brand/assets/*.svg
```

Uma diferença pode ser legítima apenas se vier de uma alteração de marca
explicitamente decidida e versionada. Caso contrário, reverta a derivação e use
o arquivo oficial do HEAD.
