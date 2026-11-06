import { PageHeader } from "../PageHeader";
import { Simulator } from "./Simulator";

export default function SimulatorPage() {
  return (
    <>
      <PageHeader title="Simulateur" subtitle="Joue le rôle d'un abonné pour tester tes scénarios actifs. Aucun vrai message n'est envoyé." />
      <Simulator />
    </>
  );
}
