from pydantic import BaseModel, Field


class Expertise(BaseModel):
    title: str = Field(alias="titre_expertise", description="Intitulé général du groupe de compétences. Ou nom du domaine d’expertise.", examples=["Développement Back-end", "Gestion de Projet", "Bases de données"])
    bullet_skills: str = Field(alias="expertises", description="Basé sur l’expérience professionnelle. Liste à puces (une chaîne).", examples=["• Compétence 1\n • Compétence 2\n • Compétence 3"])
    level: str = Field(alias="niveau_expertise", description="Niveau: Junior (<= 3 ans), Autonome (4+ ans), Expert (8+ ans).", examples=["Junior", "Autonome", "Expert"])


class SavoirEtre(BaseModel):
    text: str = Field(alias="compétence", description="Mot-clé ou expression courte de savoir-être", examples=["• Esprit d’équipe\n", "• Sens de l’organisation\n", "• Adaptabilité\n"])


class Language(BaseModel):
    name: str = Field(alias="langue", description="Nom de la langue.")
    level: str = Field(alias="niveau", description="Niveau: Novice (A1 - A2), Intermédiaire (B1 - B2), Courant (C1 - C2), Maternelle", examples=["Novice", "Intermédiaire", "Courant", "Maternelle"])


class Diploma(BaseModel):
    title: str = Field(alias="intitule", description="Intitulé du diplôme ou formation.", examples=["Master Informatique", "Licence Pro Développement Web"])
    date: str = Field(alias="date", description="Date d'obtention (année ou mois année).", examples=["2022", "Juin 2021"])
    school: str = Field(alias="école", description="Établissement ou école.", examples=["Université de Strasbourg", "CNAM"])


class Experience(BaseModel):
    start: str = Field(alias="début", description="Mois Année", examples=["Janvier 2022", "2019"])
    end: str = Field(alias="fin", description="Mois Année ou 'En cours'.", examples=["En cours", "2022", "Décembre 2023"])
    company: str = Field(alias="société", description="Nom de l’entreprise.")
    industry: str = Field(alias="secteur_activité", description="Secteur d’activité ou domain", examples=["• Banque\n", "• Assurance\n", "• Télécommunications\n", "• Santé\n"])
    program: str = Field(alias="programme", description="Nom ou description du programme/projet.")
    role: str = Field(alias="poste", description="Poste occupé.", examples=["• Consultant DevOps\n", "• Chef de Projet\n", "• Ingénieur Sécurité\n"])
    objective: str = Field(alias="objectif", description="Objectif principal de la mission.")
    activities: str = Field(alias="activités", description="Activités réalisées. Liste à puces (une chaîne).", examples=["• <Activité 1>\n • <Activité 2>\n • <Activité 3>"])
    tech_environment: str = Field(alias="environnement_technique", description="Environnement Technique. Liste à puces (une chaîne).", examples=["• Environnement 1\n • Environnement 2\n • Environnement 3"])
    mobilized_expertise: str = Field(alias="expertise_mobilisées", description="Expertises mobilisées. Liste à puces (une chaîne).", examples=["• Expertise 1\n • Maintenance système\n"])

class CVSchema(BaseModel):
    full_name: str = Field(
        alias="nom",
        description="Nom complet au format 'Prénom Nom'.",
        examples=["Jean Dupont"],
    )
    phone_e164: str = Field(
        alias="téléphone",
        description="Numéro de téléphone au format international (E.164)",
        examples=["+33601020304"],
    )
    primary_industry: str = Field(
        alias="secteur_d_activité",
        description="Secteur d’activité principal du candidat.",
    )
    contexte: str = Field(
        alias="contexte",
        description="Résumé synthétique du CV en 2 à 4 phrases : profil, années d’expérience, domaines clés, objectif professionnel. Basé uniquement sur les informations du CV.",
        examples=["Consultant IT avec 5 ans d’expérience en développement et gestion de projet. Domaines : banque, assurance. Recherche un poste de lead technique."],
    )

    diplômes: list[Diploma] = Field(default_factory=list, alias="diplômes")
    expertises: list[Expertise] = Field(default_factory=list, alias="expertises")
    savoir_etre: list[SavoirEtre] = Field(default_factory=list, alias="savoir_etre")
    languages: list[Language] = Field(default_factory=list, alias="langues")
    experiences: list[Experience] = Field(default_factory=list, alias="expériences")
