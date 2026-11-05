import { PrismaClient, Role, CustomerFileStatus, LimitRequestStatus, DecisionType, ActivationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PROORGA database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.bankingActivation.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.requestVersion.deleteMany();
  await prisma.limitRequest.deleteMany();
  await prisma.account.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Users
  // Clients
  const client1User = await prisma.user.create({
    data: {
      id: 'c1111111-1111-1111-1111-111111111111',
      email: 'client1@proorga.bank',
      passwordHash,
      firstName: 'Karim',
      lastName: 'Alami',
      role: Role.CLIENT,
    },
  });

  const client2User = await prisma.user.create({
    data: {
      id: 'c2222222-2222-2222-2222-222222222222',
      email: 'client2@proorga.bank',
      passwordHash,
      firstName: 'Leila',
      lastName: 'Benjelloun',
      role: Role.CLIENT,
    },
  });

  const client3User = await prisma.user.create({
    data: {
      id: 'c3333333-3333-3333-3333-333333333333',
      email: 'client3@proorga.bank',
      passwordHash,
      firstName: 'Youssef',
      lastName: 'Tazi',
      role: Role.CLIENT,
    },
  });

  // Advisors
  const advisor1User = await prisma.user.create({
    data: {
      id: 'a1111111-1111-1111-1111-111111111111',
      email: 'conseiller1@proorga.bank',
      passwordHash,
      firstName: 'Mehdi',
      lastName: 'Chraibi',
      role: Role.CONSEILLER,
      portfolioId: 'PORTFOLIO_CASA_CENTRE',
    },
  });

  const advisor2User = await prisma.user.create({
    data: {
      id: 'a2222222-2222-2222-2222-222222222222',
      email: 'conseiller2@proorga.bank',
      passwordHash,
      firstName: 'Fatima-Zahra',
      lastName: 'Idrissi',
      role: Role.CONSEILLER,
      portfolioId: 'PORTFOLIO_RABAT_AGDAL',
    },
  });

  // Supervisors
  const supervisor1User = await prisma.user.create({
    data: {
      id: 's1111111-1111-1111-1111-111111111111',
      email: 'superviseur1@proorga.bank',
      passwordHash,
      firstName: 'Omar',
      lastName: 'Berrada',
      role: Role.SUPERVISEUR,
      teamId: 'TEAM_RETAIL_RISK_NORTH',
    },
  });

  const supervisor2User = await prisma.user.create({
    data: {
      id: 's2222222-2222-2222-2222-222222222222',
      email: 'superviseur2@proorga.bank',
      passwordHash,
      firstName: 'Nadia',
      lastName: 'Mansouri',
      role: Role.SUPERVISEUR,
      teamId: 'TEAM_RETAIL_RISK_NORTH',
    },
  });

  // Admin
  await prisma.user.create({
    data: {
      id: 'd1111111-1111-1111-1111-111111111111',
      email: 'admin@proorga.bank',
      passwordHash,
      firstName: 'Tariq',
      lastName: 'Amrani',
      role: Role.ADMIN,
    },
  });

  console.log('✅ Users created.');

  // 3. Create Customer Profiles
  const profile1 = await prisma.customerProfile.create({
    data: {
      id: 'cp111111-1111-1111-1111-111111111111',
      userId: client1User.id,
      cin: 'BE849201',
      fileStatus: CustomerFileStatus.COMPLETE,
      address: '42 Boulevard d’Anfa, Casablanca, Maroc',
      phone: '+212 661 12 34 56',
    },
  });

  const profile2 = await prisma.customerProfile.create({
    data: {
      id: 'cp222222-2222-2222-2222-222222222222',
      userId: client2User.id,
      cin: 'AA450912',
      fileStatus: CustomerFileStatus.COMPLETE,
      address: '15 Avenue Mohammed V, Rabat, Maroc',
      phone: '+212 663 98 76 54',
    },
  });

  const profile3 = await prisma.customerProfile.create({
    data: {
      id: 'cp333333-3333-3333-3333-333333333333',
      userId: client3User.id,
      cin: 'CD772183',
      fileStatus: CustomerFileStatus.INCOMPLETE,
      incompleteReason: 'Justificatif de domicile de moins de 3 mois et renouvellement CIN manquants.',
      address: '8 Rue Hassan II, Tanger, Maroc',
      phone: '+212 665 43 21 00',
    },
  });

  console.log('✅ Customer profiles created.');

  // 4. Create Bank Accounts
  const account1 = await prisma.account.create({
    data: {
      id: 'ac111111-1111-1111-1111-111111111111',
      customerProfileId: profile1.id,
      accountNumber: '230010000000123456789012',
      iban: 'MA64230010000000123456789012',
      balance: 75450.00,
      initialTransferLimit: 10000.00,
      currentTransferLimit: 10000.00,
      currency: 'MAD',
    },
  });

  const account2 = await prisma.account.create({
    data: {
      id: 'ac222222-2222-2222-2222-222222222222',
      customerProfileId: profile2.id,
      accountNumber: '230010000000987654321098',
      iban: 'MA64230010000000987654321098',
      balance: 142800.00,
      initialTransferLimit: 10000.00,
      currentTransferLimit: 10000.00,
      currency: 'MAD',
    },
  });

  const account3 = await prisma.account.create({
    data: {
      id: 'ac333333-3333-3333-3333-333333333333',
      customerProfileId: profile3.id,
      accountNumber: '230010000000554433221100',
      iban: 'MA64230010000000554433221100',
      balance: 28900.00,
      initialTransferLimit: 10000.00,
      currentTransferLimit: 10000.00,
      currency: 'MAD',
    },
  });

  console.log('✅ Accounts created.');

  // 5. Create Pre-existing Seed Requests
  // Request 1: Active request for Client 1 (25,000 DH), approved by Advisor 1, active for 3 days
  const now = new Date();
  const activeFrom = new Date(now.getTime() - 3600 * 1000 * 3);
  const activeUntil = new Date(now.getTime() + 3600 * 1000 * 24 * 3);

  const reqActive = await prisma.limitRequest.create({
    data: {
      id: 'req-active-25k',
      reference: 'REQ-2026-0001',
      accountId: account1.id,
      customerProfileId: profile1.id,
      initialLimit: 10000.0,
      requestedLimit: 25000.0,
      durationDays: 3,
      reason: 'Achat équipements informatiques et mobilier de bureau professionnel',
      status: LimitRequestStatus.ACTIVE,
      version: 2,
      assignedAdvisorId: advisor1User.id,
      requiredDocumentsProvided: true,
      activeFrom,
      activeUntil,
      createdAt: new Date(now.getTime() - 3600 * 1000 * 24),
    },
  });

  await prisma.decision.create({
    data: {
      requestId: reqActive.id,
      decisionType: DecisionType.APPROVE,
      motive: 'Client historique sans incident bancaire. Solde suffisant pour couvrir le plafond demandé.',
      targetVersion: 1,
      actorId: advisor1User.id,
      actorRole: Role.CONSEILLER,
      createdAt: new Date(now.getTime() - 3600 * 1000 * 4),
    },
  });

  await prisma.bankingActivation.create({
    data: {
      requestId: reqActive.id,
      idempotencyKey: 'seed-activation-req-2026-0001',
      attemptNumber: 1,
      status: ActivationStatus.SUCCESS,
      limitApplied: 25000.0,
      activatedAt: activeFrom,
    },
  });

  await prisma.account.update({
    where: { id: account1.id },
    data: {
      currentTransferLimit: 25000.0,
      activeLimitExpiry: activeUntil,
    },
  });

  // Request A: An escalated request for Client 2 (65,000 DH), recommended by Advisor 1, awaiting Supervisor decision
  const reqEscalated = await prisma.limitRequest.create({
    data: {
      id: 'req-escalated-65k',
      reference: 'REQ-2026-0042',
      accountId: account2.id,
      customerProfileId: profile2.id,
      initialLimit: 10000.00,
      requestedLimit: 65000.00,
      durationDays: 4,
      reason: 'Achat véhicule d’occasion - virement concessionnaire requis sous 48h',
      status: LimitRequestStatus.PENDING_SUPERVISOR,
      version: 2,
      assignedAdvisorId: advisor1User.id,
      requiredDocumentsProvided: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 6),
    },
  });

  // Attached Document for Request A (> 50,000 DH)
  await prisma.requestDocument.create({
    data: {
      requestId: reqEscalated.id,
      fileName: 'bon_commande_vehicule.pdf',
      fileType: 'application/pdf',
      fileSize: 245000,
      storagePath: 'uploads/fictional_bon_commande.pdf',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploadedById: client2User.id,
    },
  });

  // Recommendation Decision by Advisor 1
  await prisma.decision.create({
    data: {
      requestId: reqEscalated.id,
      decisionType: DecisionType.RECOMMEND_APPROVAL,
      motive: 'Client patrimonial avec solde supérieur à 140 000 DH. Bon de commande vérifié. Avis très favorable.',
      targetVersion: 1,
      actorId: advisor1User.id,
      actorRole: Role.CONSEILLER,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
  });

  // Snapshot for version 1
  await prisma.requestVersion.create({
    data: {
      requestId: reqEscalated.id,
      versionNumber: 1,
      snapshot: {
        requestedLimit: 65000,
        durationDays: 4,
        reason: 'Achat véhicule d’occasion',
        status: LimitRequestStatus.SUBMITTED,
      },
      changeReason: 'Soumission initiale du client avec justificatif',
      createdById: client2User.id,
    },
  });

  // Seed Notifications for Demo Accounts
  await prisma.notification.createMany({
    data: [
      {
        userId: client1User.id,
        type: 'REQUEST_SUBMITTED',
        title: 'Demande REQ-2026-0001 soumise',
        message: 'Votre demande de relèvement à 25 000 DH (3 jours) a été transmise à votre banque.',
        link: '/requests?ref=REQ-2026-0001',
        read: true,
        metadata: { reference: 'REQ-2026-0001', requestedLimit: 25000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 24),
      },
      {
        userId: client1User.id,
        type: 'ADVISOR_REVIEWING',
        title: "Dossier en cours d'examen — REQ-2026-0001",
        message: 'Votre conseiller (Hassan Benali) étudie actuellement les éléments de votre dossier.',
        link: '/requests?ref=REQ-2026-0001',
        read: true,
        metadata: { reference: 'REQ-2026-0001' },
        createdAt: new Date(Date.now() - 3600 * 1000 * 20),
      },
      {
        userId: client1User.id,
        type: 'REQUEST_APPROVED',
        title: 'Demande approuvée — REQ-2026-0001',
        message: 'Excellente nouvelle ! Votre demande de relèvement à 25 000 DH a été formellement validée par Hassan Benali (CONSEILLER).',
        link: '/requests?ref=REQ-2026-0001',
        read: false,
        metadata: { reference: 'REQ-2026-0001', requestedLimit: 25000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 4),
      },
      {
        userId: client1User.id,
        type: 'LIMIT_ACTIVATED',
        title: 'Plafond temporaire activé — REQ-2026-0001',
        message: 'Votre plafond de virement de 25 000 DH est maintenant actif sur votre compte principal.',
        link: '/requests?ref=REQ-2026-0001',
        read: false,
        metadata: { reference: 'REQ-2026-0001', limitApplied: 25000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 3),
      },
      // Client 2 (Escalated flow)
      {
        userId: client2User.id,
        type: 'SUPERVISOR_PENDING',
        title: 'Arbitrage hiérarchique — REQ-2026-0042',
        message: 'Votre demande de 65 000 DH a été recommandée favorablement et transmise au superviseur pour arbitrage.',
        link: '/requests?ref=REQ-2026-0042',
        read: false,
        metadata: { reference: 'REQ-2026-0042', requestedLimit: 65000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 2),
      },
      // Advisor 1
      {
        userId: advisor1User.id,
        type: 'REQUEST_SUBMITTED',
        title: 'Nouveau dossier REQ-2026-0042',
        message: 'Dossier de 65 000 DH soumis par Fatima Zahra Bennani. En attente de votre revue.',
        link: '/advisor?ref=REQ-2026-0042',
        read: true,
        metadata: { reference: 'REQ-2026-0042', requestedLimit: 65000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 6),
      },
      // Supervisor 1
      {
        userId: supervisor1User.id,
        type: 'SUPERVISOR_PENDING',
        title: 'Validation superviseur requise — REQ-2026-0042',
        message: 'Dossier de 65 000 DH recommandé par Hassan Benali. En attente de votre décision hiérarchique.',
        link: '/supervisor?ref=REQ-2026-0042',
        read: false,
        metadata: { reference: 'REQ-2026-0042', requestedLimit: 65000 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 2),
      },
    ],
  });

  console.log('✅ Demo request data seeded.');
  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
