"use client";

import "./casino.css";
import { PageTitle } from "@/components/ui";
import { CasinoLobby } from "@/components/casino/CasinoLobby";
import { CasinoAudioBridge } from "@/components/casino/CasinoAudioBridge";

export default function CasinoPage() {
  return (
    <div className="casino-root stack">
      <div className="casino-backdrop" aria-hidden />
      <div className="casino-bg" aria-hidden />
      <CasinoAudioBridge />
      <PageTitle
        pixelIcon="cards"
        sub="كازينو بكسل مستقل تماماً: طاولات بقواعد حقيقية، شيبس افتراضية، وإحصاءات محسوبة من سجلك الفعلي. لا علاقة له بنقاط الدوري."
      >
        JACKAROO CASINO
      </PageTitle>
      <CasinoLobby />
    </div>
  );
}
