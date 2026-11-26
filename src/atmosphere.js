/* Ar limpo: sem névoa, sem poeira suspensa e sem cone volumétrico.
   O "volume" do porão agora vem só da luz que a lanterna realmente acerta.
   Mantemos a mesma interface para não mexer no loop principal. */

export function createAtmosphere() {
  return {
    update() {},
    beam: null,
  };
}
