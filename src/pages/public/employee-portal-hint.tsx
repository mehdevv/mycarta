export default function EmployeePortalHint() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Connexion employé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Utilisez le lien de connexion fourni par votre employeur pour accéder à l&apos;espace équipe.
        </p>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          Ce lien est propre à chaque boutique. Demandez le QR ou l&apos;URL à votre responsable si vous ne
          l&apos;avez pas.
        </p>
      </div>
    </div>
  );
}
