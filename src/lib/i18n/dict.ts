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

export const DEFAULT_LOCALE: Locale = "zh";

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
  "nav.provenance": { fr: "Traçabilité", en: "Provenance" },
  "nav.blog": { fr: "À propos", en: "Blog" },
  "nav.sign_in": { fr: "Connexion", en: "Sign in" },
  "nav.reports": { fr: "Rapports", en: "Reports" },
  "reports.page.eyebrow": { fr: "Intelligence autorisée", en: "Authorized intelligence" },
  "reports.page.title": { fr: "Rapports", en: "Reports" },
  "reports.page.subtitle": {
    fr: "Voir les rapports publics et ceux qui vous ont été autorisés par un domaine, un négociant ou un partenaire logistique.",
    en: "View public reports and reports authorized for you by a winery, merchant, or supply-chain partner.",
  },
  "reports.page.empty": {
    fr: "Sélectionnez un rapport autorisé dans la colonne de gauche.",
    en: "Pick an authorized report from the left column.",
  },
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
  "auth.nav.platform_admin": { fr: "Administration plateforme", en: "Platform Admin" },
  "auth.nav.organization_admin": { fr: "Administration organisation", en: "Org Admin" },
  "auth.nav.sign_out": { fr: "Se déconnecter", en: "Sign out" },
  "auth.organization.unassigned": { fr: "Non attribuée", en: "Unassigned" },
  "auth.security.eyebrow": { fr: "Sécurité du compte", en: "Account security" },
  "auth.security.title": { fr: "Modifier le mot de passe", en: "Change password" },
  "auth.security.description": {
    fr: "Utilisez au moins 12 caractères. Vous serez déconnecté après la modification.",
    en: "Use at least 12 characters. You will be signed out after the change.",
  },
  "auth.security.current_password": { fr: "Mot de passe actuel", en: "Current password" },
  "auth.security.new_password": { fr: "Nouveau mot de passe · 12 caractères minimum", en: "New password · at least 12 characters" },
  "auth.security.confirm_password": { fr: "Confirmer le nouveau mot de passe", en: "Confirm new password" },
  "auth.security.update": { fr: "Modifier le mot de passe", en: "Update password" },
  "auth.security.updating": { fr: "Modification…", en: "Updating…" },
  "auth.security.back": { fr: "Retour au tableau de bord", en: "Back to dashboard" },
  "auth.security.devices": { fr: "Appareils", en: "Devices" },
  "auth.security.sessions": { fr: "Sessions actives", en: "Active sessions" },
  "auth.security.sign_out_others": { fr: "Déconnecter les autres", en: "Sign out others" },
  "auth.security.this_device": { fr: "Cet appareil", en: "This device" },
  "auth.security.another_device": { fr: "Autre appareil", en: "Another device" },
  "auth.security.unknown_browser": { fr: "Navigateur inconnu", en: "Unknown browser" },
  "auth.security.last_active": { fr: "Dernière activité {time}", en: "Last active {time}" },
  "auth.security.revoke": { fr: "Révoquer", en: "Revoke" },
  "auth.security.password_mismatch": { fr: "Les nouveaux mots de passe ne correspondent pas.", en: "New passwords do not match." },
  "auth.security.update_failed": { fr: "La modification du mot de passe a échoué.", en: "Password update failed." },
  "auth.security.current_incorrect": { fr: "Le mot de passe actuel est incorrect.", en: "Current password is incorrect." },
  "auth.security.must_differ": { fr: "Le nouveau mot de passe doit être différent.", en: "New password must be different." },

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
  "landing.provenance.title": { fr: "Traçabilité", en: "Provenance" },
  "landing.provenance.subtitle": {
    fr: "Cartes d'origine simples pour bouteilles, lots et documents de circulation",
    en: "Simple origin cards for bottles, batches, and trade documents",
  },
  "landing.provenance.cta": {
    fr: "Ouvrir la traçabilité",
    en: "Open provenance cards",
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

  // ── provenance ───────────────────────────────────────────────────────
  "provenance.eyebrow": { fr: "Traçabilité du vin", en: "Wine provenance" },
  "provenance.title": {
    fr: "Cartes d'origine simples pour bouteilles et lots",
    en: "Simple origin cards for bottles and batches",
  },
  "provenance.subtitle": {
    fr: "Cuvée garde la traçabilité légère : les domaines prouvent l'origine par une déclaration d'autorité et une preuve de lot ; les négociants prouvent la confiance par les mouvements et les documents concordants.",
    en: "Cuvée keeps provenance lightweight: wineries prove origin with an authority statement and batch proof; merchants prove trust with movement records and matching documents.",
  },
  "provenance.card.eyebrow": { fr: "Carte bouteille", en: "Bottle card" },
  "provenance.card.winery": { fr: "Carte domaine", en: "Winery card" },
  "provenance.card.trade": { fr: "Carte négoce", en: "Trade card" },
  "provenance.status.winery": { fr: "Déclaration vérifiée", en: "Declaration verified" },
  "provenance.status.trade": { fr: "Chaîne commerciale vérifiée", en: "Trade chain verified" },

  "provenance.mode.winery": { fr: "Mode domaine", en: "Winery mode" },
  "provenance.mode.trade": { fr: "Mode négoce", en: "Trade mode" },
  "provenance.sample.winery.name": { fr: "Château Demo 2024", en: "Château Demo 2024" },
  "provenance.sample.winery.region": { fr: "Bordeaux · Pauillac", en: "Bordeaux · Pauillac" },
  "provenance.sample.winery.batch": { fr: "LOT-PAU-2024-017", en: "LOT-PAU-2024-017" },
  "provenance.sample.winery.alt_name": { fr: "Réserve Demo 2024", en: "Demo Reserve 2024" },
  "provenance.sample.winery.alt_region": { fr: "Bordeaux · Margaux", en: "Bordeaux · Margaux" },
  "provenance.sample.winery.alt_batch": { fr: "LOT-MAR-2024-041", en: "LOT-MAR-2024-041" },
  "provenance.sample.trade.name": { fr: "Lot importé Demo 2024", en: "Demo imported lot 2024" },
  "provenance.sample.trade.region": { fr: "Bordeaux · chaîne commerciale", en: "Bordeaux · trade chain" },
  "provenance.sample.trade.batch": { fr: "LOT-IMP-2024-088", en: "LOT-IMP-2024-088" },
  "provenance.sample.trade.alt_name": { fr: "Lot distributeur Demo", en: "Demo distributor lot" },
  "provenance.sample.trade.alt_region": { fr: "Bordeaux · entrepôt", en: "Bordeaux · warehouse" },
  "provenance.sample.trade.alt_batch": { fr: "LOT-DS-2024-019", en: "LOT-DS-2024-019" },
  "provenance.sample.name": { fr: "Château Demo 2024", en: "Château Demo 2024" },
  "provenance.sample.region": { fr: "Bordeaux · Pauillac", en: "Bordeaux · Pauillac" },
  "provenance.status.partial": { fr: "Partiellement vérifié", en: "Partially verified" },
  "provenance.field.region": { fr: "Région", en: "Region" },
  "provenance.field.vintage": { fr: "Millésime", en: "Vintage" },
  "provenance.field.batch": { fr: "Lot", en: "Batch" },
  "provenance.field.proof_model": { fr: "Modèle de preuve", en: "Proof model" },
  "provenance.proof_model": { fr: "domaine + négoce", en: "winery + trade" },
  "provenance.verification.title": { fr: "Résultat de vérification", en: "Verification result" },
  "provenance.verification.body": {
    fr: "L'origine est crédible lorsque la déclaration du producteur, le numéro de lot, le document fournisseur et le mouvement pointent vers le même vin. Les preuves manquantes ou contradictoires abaissent le statut.",
    en: "Origin is credible when the producer claim, batch number, supplier document, and movement record all point to the same wine. Missing or conflicting evidence lowers the status.",
  },
  "provenance.workflow.title": { fr: "Flux minimal", en: "Minimal workflow" },
  "provenance.workflow.create_card": {
    fr: "Créer une carte bouteille ou lot",
    en: "Create bottle or batch card",
  },
  "provenance.workflow.authority": {
    fr: "Joindre la déclaration d'autorité du domaine",
    en: "Attach winery authority statement",
  },
  "provenance.workflow.batch": { fr: "Joindre la preuve de lot", en: "Attach batch or lot proof" },
  "provenance.workflow.trade_docs": {
    fr: "Ajouter les documents de circulation",
    en: "Add trade movement documents",
  },
  "provenance.workflow.publish_qr": {
    fr: "Publier une carte d'origine lisible par QR",
    en: "Publish a QR-readable origin card",
  },
  "provenance.winery.strategy": { fr: "Stratégie domaine", en: "Winery strategy" },
  "provenance.winery.title": {
    fr: "Déclaration d'autorité + preuve de lot",
    en: "Authority statement + batch proof",
  },
  "provenance.winery.authority.label": { fr: "Déclaration d'autorité", en: "Authority statement" },
  "provenance.winery.authority.title": {
    fr: "Déclaration d'origine du producteur",
    en: "Producer origin claim",
  },
  "provenance.winery.authority.body": {
    fr: "Le domaine déclare le nom du vin, l'appellation, le millésime, la propriété et le canal de sortie autorisé.",
    en: "The winery declares the wine name, appellation, vintage, estate, and authorized release channel.",
  },
  "provenance.winery.batch.label": { fr: "Preuve de lot", en: "Batch proof" },
  "provenance.winery.batch.title": {
    fr: "Identité du lot de production",
    en: "Production batch identity",
  },
  "provenance.winery.batch.body": {
    fr: "Le numéro de lot relie les bouteilles aux registres de vendange, vinification, mise en bouteille et sortie.",
    en: "The batch number ties bottles back to harvest, vinification, bottling, and release records.",
  },
  "provenance.trade.strategy": { fr: "Stratégie négoce", en: "Trade strategy" },
  "provenance.trade.title": {
    fr: "Mouvement + preuve documentaire",
    en: "Movement record + document proof",
  },
  "provenance.trade.movement.label": { fr: "Mouvement", en: "Movement record" },
  "provenance.trade.movement.title": { fr: "Parcours d'approvisionnement", en: "Supply path" },
  "provenance.trade.movement.body": {
    fr: "Le négociant enregistre le fournisseur, la date d'arrivée et le canal par lequel le vin est passé.",
    en: "The merchant records who supplied the wine, when it arrived, and which channel it came through.",
  },
  "provenance.trade.document.label": { fr: "Preuve documentaire", en: "Document proof" },
  "provenance.trade.document.title": { fr: "Documents commerciaux", en: "Commercial paperwork" },
  "provenance.trade.document.body": {
    fr: "Les documents doivent correspondre à l'étiquette, au millésime, au lot, à la quantité et à l'amont.",
    en: "The documents must match the label, vintage, batch, quantity, and upstream party.",
  },
  "provenance.evidence.estate_registration": {
    fr: "enregistrement du domaine",
    en: "estate registration",
  },
  "provenance.evidence.aoc_declaration": { fr: "déclaration AOC/AOP", en: "AOC/AOP declaration" },
  "provenance.evidence.authorized_seller": {
    fr: "liste des vendeurs autorisés",
    en: "authorized seller list",
  },
  "provenance.evidence.lot_number": { fr: "numéro de lot", en: "lot number" },
  "provenance.evidence.bottling_sheet": { fr: "fiche de mise", en: "bottling sheet" },
  "provenance.evidence.release_note": { fr: "note de sortie", en: "release note" },
  "provenance.evidence.supplier_invoice": {
    fr: "facture fournisseur",
    en: "supplier invoice",
  },
  "provenance.evidence.warehouse_receipt": {
    fr: "reçu d'entrepôt",
    en: "warehouse receipt",
  },
  "provenance.evidence.shipping_handoff": {
    fr: "passage transport",
    en: "shipping handoff",
  },
  "provenance.evidence.invoice": { fr: "facture", en: "invoice" },
  "provenance.evidence.customs_document": {
    fr: "document douanier",
    en: "customs document",
  },
  "provenance.evidence.temperature_log": {
    fr: "journal de température",
    en: "temperature log",
  },
  "provenance.evidence.title": { fr: "Preuves associées", en: "Linked evidence" },
  "provenance.evidence.upload": { fr: "Téléverser", en: "Upload" },
  "provenance.evidence.local_note": {
    fr: "Les fichiers ajoutés ici sont visibles seulement dans cette session.",
    en: "Files added here are visible only in this session.",
  },
  "provenance.timeline.title": { fr: "Parcours d'origine", en: "Origin timeline" },
  "provenance.timeline.harvest": { fr: "Vendange enregistrée par le domaine", en: "Harvest recorded by the winery" },
  "provenance.timeline.cellar": { fr: "Passage en cave confirmé", en: "Cellar stage confirmed" },
  "provenance.timeline.bottling": { fr: "Mise en bouteille liée au lot", en: "Bottling linked to the lot" },
  "provenance.timeline.release": { fr: "Sortie autorisée du domaine", en: "Authorized release from the winery" },
  "provenance.timeline.supplier": { fr: "Fournisseur et facture enregistrés", en: "Supplier and invoice recorded" },
  "provenance.timeline.warehouse": { fr: "Réception en entrepôt confirmée", en: "Warehouse receipt confirmed" },
  "provenance.timeline.buyer": { fr: "Livraison au client rapprochée", en: "Buyer delivery reconciled" },
  "provenance.timeline.shipment": { fr: "Transport et remise consignés", en: "Shipment and handoff logged" },
  "provenance.timeline.customs": { fr: "Document douanier rapproché", en: "Customs document matched" },
  "provenance.timeline.reception": { fr: "Réception finale contrôlée", en: "Final receipt checked" },
  "provenance.product.add": { fr: "Ajouter un produit", en: "Add product" },
  "provenance.product.remove": { fr: "Supprimer", en: "Remove" },
  "provenance.product.selected": { fr: "来源卡", en: "Selected card" },
  "provenance.product.card_hint": { fr: "点击查看详情", en: "Click to inspect" },
  "provenance.product.total": { fr: "总数", en: "Cards" },
  "provenance.product.active": { fr: "当前", en: "Active" },
  "provenance.product.proof": { fr: "证据", en: "Evidence" },
  "provenance.public.generate": { fr: "Générer un lien public", en: "Generate public link" },
  "provenance.public.generating": { fr: "Génération…", en: "Generating…" },
  "provenance.public.title": { fr: "Lien public", en: "Public link" },
  "provenance.public.subtitle": {
    fr: "Copiez ou ouvrez ce lien pour afficher la version publique en lecture seule.",
    en: "Copy or open this link to view the public read-only version.",
  },
  "provenance.public.open": { fr: "Ouvrir", en: "Open" },
  "provenance.public.copy": { fr: "Copier", en: "Copy" },

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
