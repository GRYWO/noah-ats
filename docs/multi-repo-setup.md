# Drie Noah-projecten in één werkplek

Doel: **Noah ATS**, **Noah recruitment** en **Noah launch** samen in één Claude Code-sessie,
zodat ze tegelijk bewerkt kunnen worden.

## Eenmalig instellen (op claude.ai/code)

1. Ga naar [claude.ai/code](https://claude.ai/code).
2. Klik op het **omgevings-icoon** (toont de naam van je omgeving).
3. Klik op het **tandwiel/settings-icoon** naast de omgeving (of maak een nieuwe via **Add environment**).
4. Zoek het veld **Setup script** en plak hierin:

   ```bash
   cd "$(dirname "$PWD")"
   [ -d noah-recruitment ] || git clone https://github.com/GRYWO/noah-recruitment.git
   [ -d noah-launch.nl ]   || git clone https://github.com/GRYWO/noah-launch.nl.git
   ```

5. Zet **Network access** op een niveau dat minstens GitHub toestaat.
6. **Opslaan**.
7. Start een **nieuwe** sessie in die omgeving.

> Let op: het setup-script is zichtbaar voor iedereen die de omgeving mag bewerken.
> Zet er geen geheimen in; gebruik daarvoor environment variables.

## Resultaat

In de nieuwe sessie staan de projecten naast elkaar in de werkmap:

```
noah-ats/
noah-recruitment/
noah-launch.nl/
```

## Hoe ze "samenwerken"

- **Code**: nu samen in één sessie, dus aanpasbaar in samenhang.
- **Runtime**: ATS en website delen al de **Supabase-database** (o.a. de tabel `rec_vacatures`;
  een ATS-vacature verschijnt op `noah-recruitment.nl/vacatures/{id}`). Dat is de echte koppeling.
