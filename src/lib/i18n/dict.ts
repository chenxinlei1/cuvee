/**
 * i18n dictionary — English (en) + French (fr) + Simplified Chinese (zh).
 *
 * Source of truth for every user-facing string. Add a key here, then use
 * `useT()(key)` from any component. Keep keys snake_case + namespaced.
 */

export type Locale = "en" | "fr" | "zh";

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "zh", label: "简体中文", short: "中" },
];

export const DEFAULT_LOCALE: Locale = "en";

export const DICT = {
  // ── common ────────────────────────────────────────────────────────────
  "common.app_name": { fr: "Cuvée", en: "Cuvée" },
  "common.back_home": { fr: "Retour à l'accueil", en: "Back to home" },
  "common.config": { fr: "Configuration", en: "Configuration" },
  "common.loading": { fr: "Chargement…", en: "Loading…" },
  "common.error": { fr: "Erreur", en: "Error" },
  "common.demo_mode": { fr: "Mode démo", en: "Demo mode" },
  "common.run_analysis": { fr: "Lancer l'analyse", en: "Run analysis" },
  "common.running": { fr: "En cours…", en: "Running…" },
  "common.analysis_complete": { fr: "Analyse terminée", en: "Analysis complete" },
  "common.view_report": { fr: "Voir le rapport", en: "View report" },
  "common.report_ready_title": {
    fr: "Le rapport est prêt",
    en: "Your report is ready",
  },
  "common.report_ready_hint": {
    fr: "Tous les agents ont terminé. Cliquez pour afficher les résultats détaillés.",
    en: "All agents completed. Click to reveal the detailed results below.",
  },
  "common.report_language_notice": {
    fr: "Ce rapport a été généré en {language}. Relancez l’analyse pour le générer dans la langue actuelle.",
    en: "This report was generated in {language}. Run the analysis again to generate it in the current language.",
  },
  "common.export_report": { fr: "Exporter le rapport", en: "Export report" },
  "common.subscribe": { fr: "S'abonner", en: "Subscribe" },
  "common.cancel": { fr: "Annuler", en: "Cancel" },
  "common.confirm": { fr: "Confirmer", en: "Confirm" },
  "common.region": { fr: "Région", en: "Region" },
  "common.timeframe": { fr: "Période", en: "Timeframe" },
  "common.start_date": { fr: "Début", en: "From" },
  "common.end_date": { fr: "Fin", en: "To" },
  "common.search": { fr: "Rechercher", en: "Search" },
  "common.clear": { fr: "Effacer", en: "Clear" },
  "common.close": { fr: "Fermer", en: "Close" },
  "common.fullscreen": { fr: "Plein écran", en: "Fullscreen" },
  "common.exit_fullscreen": { fr: "Quitter le plein écran", en: "Exit fullscreen" },
  "common.question": { fr: "Question", en: "Question" },
  "common.question_placeholder": {
    fr: "Optionnel : précisez votre question, p. ex. risque de gel en avril",
    en: "Optional: focus question, e.g. frost risk in April",
  },
  "nav.vineyard": { fr: "Domaine", en: "Vineyard" },
  "nav.trade": { fr: "Négoce", en: "Trade" },
  "nav.blog": { fr: "À propos", en: "Blog" },
  "nav.sign_in": { fr: "Connexion", en: "Sign in" },
  "theme.light": { fr: "Clair", en: "Light" },
  "theme.dark": { fr: "Sombre", en: "Dark" },

  // ── authentication ────────────────────────────────────────────────────
  "auth.login.eyebrow": {
    fr: "Intelligence millésime d'entreprise",
    en: "Enterprise vintage intelligence",
  },
  "auth.login.hero_title": {
    fr: "Des décisions fondées sur chaque signal.",
    en: "Decisions grounded in every signal.",
  },
  "auth.login.hero_description": {
    fr: "Réunissez climat, terroir, données web et documents privés dans un flux multi-agent traçable.",
    en: "Combine climate, terroir, public-web evidence, and private vineyard documents in one traceable multi-agent workflow.",
  },
  "auth.login.metric_agents": { fr: "Agents spécialistes", en: "Specialist agents" },
  "auth.login.metric_rag": { fr: "Sources de preuves RAG", en: "RAG evidence paths" },
  "auth.login.metric_traceable": { fr: "Analyses traçables", en: "Traceable runs" },
  "auth.login.secure_workspace": { fr: "Espace sécurisé", en: "Secure workspace" },
  "auth.login.welcome": { fr: "Heureux de vous revoir", en: "Welcome back" },
  "auth.login.description": {
    fr: "Connectez-vous à l'espace Cuvée de votre organisation.",
    en: "Sign in to your organization's Cuvée workspace.",
  },
  "auth.login.email": { fr: "E-mail professionnel", en: "Work email" },
  "auth.login.password": { fr: "Mot de passe", en: "Password" },
  "auth.login.show": { fr: "Afficher", en: "Show" },
  "auth.login.hide": { fr: "Masquer", en: "Hide" },
  "auth.login.password_placeholder": { fr: "8 caractères minimum", en: "At least 8 characters" },
  "auth.login.remember": { fr: "Mémoriser cet appareil", en: "Remember this device" },
  "auth.login.forgot": { fr: "Mot de passe oublié ?", en: "Forgot password?" },
  "auth.login.submit": { fr: "Se connecter", en: "Sign in" },
  "auth.login.submitting": { fr: "Connexion…", en: "Signing in…" },
  "auth.login.request_account": { fr: "Demander un nouveau compte", en: "Request a new account" },
  "auth.login.demo": { fr: "Compte de démonstration", en: "Interview demo" },
  "auth.login.fill_demo": { fr: "Remplir les identifiants de démo", en: "Fill demo credentials" },
  "auth.login.session_note": {
    fr: "Session serveur sécurisée · Démo winery admin : winery-admin@cuvee.demo / cuvee-winery-2024.",
    en: "Secure server session · Demo winery admin: winery-admin@cuvee.demo / cuvee-winery-2024.",
  },
  "auth.login.return_home": { fr: "Retour à l'accueil", en: "Return home" },
  "auth.error.invalid_email": {
    fr: "Saisissez une adresse e-mail professionnelle valide.",
    en: "Enter a valid work email address.",
  },
  "auth.error.short_password": {
    fr: "Le mot de passe doit contenir au moins 8 caractères.",
    en: "Password must contain at least 8 characters.",
  },
  "auth.error.sign_in_failed": { fr: "Échec de la connexion.", en: "Sign in failed." },
  "auth.error.unreachable": {
    fr: "Impossible de joindre le service d'authentification.",
    en: "Unable to reach the authentication service.",
  },
  "auth.role.platform_admin": { fr: "Administrateur de la plateforme", en: "Platform Admin" },
  "auth.role.winery_admin": { fr: "Administrateur du domaine", en: "Winery Admin" },
  "auth.role.winery_staff": { fr: "Opérateur de cave", en: "Cellar Operator" },
  "auth.role.buyer_admin": { fr: "Administrateur acheteur", en: "Buyer Admin" },
  "auth.role.buyer_staff": { fr: "Acheteur", en: "Buyer Staff" },

  // ── atlas + history ─────────────────────────────────────────────────
  "atlas.title": { fr: "Atlas des vins", en: "Wine Atlas" },
  "atlas.region_count": { fr: "régions AOC françaises", en: "French AOC regions" },
  "atlas.parent": { fr: "Région mère", en: "Parent" },
  "atlas.burgundy": { fr: "Bourgogne", en: "Burgundy" },
  "atlas.bordeaux": { fr: "Bordeaux", en: "Bordeaux" },
  "atlas.selected_region": { fr: "Région sélectionnée", en: "Selected region" },
  "atlas.show_last_analysis": { fr: "Afficher la dernière analyse", en: "Show last analysis" },
  "history.title": { fr: "Historique des rapports", en: "Report history" },
  "history.empty": { fr: "Aucun rapport enregistré.", en: "No saved reports yet." },
  "history.delete": { fr: "Supprimer", en: "Delete" },
  "history.delete_aria": { fr: "Supprimer le rapport {region}", en: "Delete {region} report" },

  // ── timeframe modes ───────────────────────────────────────────────────
  "timeframe.mode.year": { fr: "Par année", en: "By year" },
  "timeframe.mode.month": { fr: "Par mois", en: "By month" },
  "timeframe.mode.range": { fr: "Personnalisé", en: "Custom range" },
  "timeframe.label.year": { fr: "Année", en: "Year" },
  "timeframe.label.month": { fr: "Mois", en: "Month" },

  // ── landing ───────────────────────────────────────────────────────────
  "landing.tagline": {
    fr: "Bourgogne & Bordeaux · Renseignement multi-agent sur le vin",
    en: "Burgundy & Bordeaux · Multi-agent wine risk & market intelligence",
  },
  "landing.choose_entry": {
    fr: "Choisissez votre profil",
    en: "Choose your role",
  },
  "landing.vineyard.title": { fr: "Domaine viticole", en: "Vineyard" },
  "landing.vineyard.subtitle": {
    fr: "Téléversez vos données pour affiner les prévisions de risques",
    en: "Upload your records to sharpen cultivation & harvest risk forecasts",
  },
  "landing.vineyard.cta": {
    fr: "Accéder au domaine",
    en: "Open the vineyard panel",
  },
  "landing.trade.title": { fr: "Négoce", en: "Trade" },
  "landing.trade.subtitle": {
    fr: "Acheteurs · supermarchés · restaurants · agents · carte de Bordeaux + tableau de bord",
    en: "Buyers · supermarkets · restaurants · agents · Bordeaux map + multi-chart dashboard",
  },
  "landing.trade.cta": {
    fr: "Accéder au négoce",
    en: "Open the trade dashboard",
  },

  // ── vineyard ──────────────────────────────────────────────────────────
  "vineyard.title": {
    fr: "Tableau de bord — Domaine",
    en: "Vineyard dashboard",
  },
  "vineyard.subtitle": {
    fr: "Choisissez votre région et téléversez vos documents internes",
    en: "Pick a region and timeframe, then upload your internal docs to enrich the analysis",
  },
  "vineyard.upload.title": {
    fr: "Documents internes",
    en: "Internal documents",
  },
  "vineyard.upload.hint": {
    fr: "Glissez vos fichiers ici ou cliquez (TXT / CSV · 100 KB max)",
    en: "Drag files here or click to pick (TXT / CSV · 100 KB max)",
  },
  "vineyard.upload.empty": { fr: "Aucun document", en: "No files yet" },
  "vineyard.upload.remove": { fr: "Retirer", en: "Remove" },
  "vineyard.upload.context_badge": {
    fr: "{n} document(s) prêt(s) pour la recherche interne",
    en: "{n} file(s) ready for internal retrieval",
  },

  // ── trade ─────────────────────────────────────────────────────────────
  "trade.title": {
    fr: "Tableau de bord — Négoce",
    en: "Trade dashboard",
  },
  "trade.subtitle": {
    fr: "Cliquez sur la carte pour sélectionner une appellation",
    en: "Click the map to pick a Bordeaux appellation; multi-chart view supports buying decisions",
  },
  "trade.map.title": {
    fr: "Carte des appellations de Bordeaux",
    en: "Bordeaux appellations map",
  },
  "trade.map.search_placeholder": {
    fr: "Rechercher un château, AOC ou commune…",
    en: "Search a château, AOC or commune…",
  },
  "trade.map.no_match": { fr: "Aucun résultat", en: "No match" },
  "trade.map.legend_low": { fr: "Risque faible", en: "Low risk" },
  "trade.map.legend_high": { fr: "Risque élevé", en: "High risk" },
  "trade.charts.drivers": { fr: "Facteurs de risque", en: "Risk drivers" },
  "trade.charts.weather": {
    fr: "Tendances climatiques (12 derniers mois)",
    en: "Weather trends (last 12 months)",
  },
  "trade.charts.weather.temp": { fr: "Anomalie thermique", en: "Temp anomaly" },
  "trade.charts.weather.precip": { fr: "Précipitations", en: "Precipitation" },
  "trade.charts.weather.frost": { fr: "Jours de gel", en: "Frost days" },
  "trade.charts.weather.avg_temp": { fr: "Anomalie moy.", en: "Avg Δ temp" },
  "trade.charts.weather.total_precip": { fr: "Précip. totale", en: "Total precip." },
  "trade.charts.weather.total_frost": { fr: "Jours de gel", en: "Frost days" },
  "trade.charts.regional": {
    fr: "Comparatif des appellations",
    en: "Risk comparison across appellations",
  },
  "trade.charts.sentiment": { fr: "Sentiment de marché", en: "Market sentiment" },
  "trade.no_result": {
    fr: "Sélectionnez une appellation puis lancez l'analyse",
    en: "Pick an appellation, then click Run analysis",
  },
  "trade.focus_chateau": { fr: "Château ciblé", en: "Focus château" },

  // ── trade sub-persona ────────────────────────────────────────────────
  "trade.persona.label": { fr: "Profil", en: "Buyer profile" },
  "trade.persona.merchant": { fr: "Négociant", en: "Merchant" },
  "trade.persona.restaurant": { fr: "Restaurant", en: "Restaurant" },
  "trade.persona.wineshop": { fr: "Cave / supermarché", en: "Wineshop" },

  // ── product picker ───────────────────────────────────────────────────
  "trade.product.label": { fr: "Produit", en: "Product" },
  "trade.product.placeholder": {
    fr: "Rechercher un vin, ex. Château Margaux…",
    en: "Search a wine, e.g. Château Margaux…",
  },

  // ── results ───────────────────────────────────────────────────────────
  "result.risk_score": { fr: "Score de risque", en: "Risk score" },
  "result.band.low": { fr: "Faible", en: "Low" },
  "result.band.moderate": { fr: "Modéré", en: "Moderate" },
  "result.band.elevated": { fr: "Élevé", en: "Elevated" },
  "result.band.high": { fr: "Critique", en: "Critical" },
  "result.band_reference": { fr: "Échelle de risque", en: "Risk band reference" },
  "result.band.advice.low": {
    fr: "Acheter avec confiance — millésime structurellement favorable.",
    en: "Buy with confidence — vintage outlook is structurally favorable.",
  },
  "result.band.advice.moderate": {
    fr: "Allocation sélective — certains signaux à surveiller.",
    en: "Selective allocation — watch a few signals before committing.",
  },
  "result.band.advice.elevated": {
    fr: "Réduire l'exposition — plusieurs risques convergent.",
    en: "Reduce exposure — multiple risks converging on this vintage.",
  },
  "result.band.advice.high": {
    fr: "Attendre, couvrir, ou s'abstenir — risques critiques actifs.",
    en: "Wait, hedge, or sit out — critical risks active.",
  },
  "result.drivers": { fr: "Facteurs", en: "Drivers" },
  "result.recommendations": { fr: "Recommandations", en: "Recommendations" },
  "result.trace": { fr: "Trace des agents", en: "Agent trace" },
  "result.partial": {
    fr: "Résultat partiel (mode démo / clé manquante / sous-agent en échec)",
    en: "Partial result (demo mode / missing key / sub-agent failure)",
  },

  // ── feature ───────────────────────────────────────────────────────────
  "feature.summary.title": { fr: "Synthèse", en: "Executive summary" },
  "feature.report.title": { fr: "Rapport complet", en: "Full report" },
  "terroir.title": { fr: "Terroir", en: "Terroir snapshot" },
  "feature.report.download": {
    fr: "Télécharger le rapport",
    en: "Download report",
  },
  "subscribe.preview_label": {
    fr: "Vous recevrez un digest comme celui-ci :",
    en: "You'll receive a digest like this:",
  },

  // ── backtest ──────────────────────────────────────────────────────────
  "backtest.title": { fr: "Validation rétroactive", en: "Backtest verification" },
  "backtest.predicted": { fr: "Prédit", en: "Predicted" },
  "backtest.predicted_quality": { fr: "Qualité prédite", en: "Predicted quality" },
  "backtest.actual": { fr: "Réel", en: "Actual" },
  "backtest.verdict_kicker": { fr: "Critiques", en: "Critic verdict" },
  "backtest.verdict.high_agreement": {
    fr: "Les critiques nous donnent raison",
    en: "Critics agree with us",
  },
  "backtest.verdict.moderate_agreement": {
    fr: "Concordance partielle des critiques",
    en: "Critics partly agree",
  },
  "backtest.verdict.divergent": {
    fr: "Les critiques nous contredisent",
    en: "Critics disagree with us",
  },
  "backtest.our_band": { fr: "Notre note de millésime", en: "Our quality band" },
  "backtest.no_critics": {
    fr: "Aucune donnée critique récupérée — configurez Tavily pour une comparaison réelle.",
    en: "No critic data retrieved — configure Tavily for real-world comparison.",
  },

  // ── blog ──────────────────────────────────────────────────────────────
  "blog.title": { fr: "Comment fonctionne Cuvée", en: "How Cuvée works" },
  "blog.subtitle": {
    fr: "Architecture, agents, et FAQ",
    en: "Architecture, agents, and FAQ",
  },

  // ── workflow ──────────────────────────────────────────────────────────
  "workflow.title": { fr: "Flux de travail", en: "Workflow" },
  "workflow.state.pending": { fr: "En attente", en: "Pending" },
  "workflow.state.running": { fr: "En cours", en: "Running" },
  "workflow.state.ok": { fr: "Terminé", en: "Done" },
  "workflow.state.fail": { fr: "Échec", en: "Failed" },

  // ── persona ───────────────────────────────────────────────────────────
  "persona.vineyard": { fr: "Domaine", en: "Vineyard" },
  "persona.trade": { fr: "Négoce", en: "Trade" },

  // ── subscribe ─────────────────────────────────────────────────────────
  "subscribe.title": {
    fr: "Abonnement hebdomadaire",
    en: "Weekly report subscription",
  },
  "subscribe.description": {
    fr: "Vous recevrez chaque semaine le rapport de risque pour vos régions",
    en: "Receive a weekly risk report for the regions you follow",
  },
  "subscribe.email_placeholder": { fr: "Adresse e-mail", en: "Email address" },
  "subscribe.success": {
    fr: "Abonnement confirmé — prochain rapport lundi.",
    en: "Subscribed — next report ships Monday.",
  },
} as const;

export type DictKey = keyof typeof DICT;
