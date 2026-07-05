import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Like, type Repository, type ObjectLiteral } from 'typeorm';
import { AppDataSource } from '../infra/database/data-source.js';
import { User } from '../infra/database/entities/user.entity.js';
import { ProfessionalProfile } from '../infra/database/entities/professional-profile.entity.js';
import { ServiceCategory } from '../infra/database/entities/service-category.entity.js';
import { ProfessionalCategory } from '../infra/database/entities/professional-category.entity.js';
import { ProfessionalServiceArea } from '../infra/database/entities/professional-service-area.entity.js';
import { ServiceDemand } from '../infra/database/entities/service-demand.entity.js';
import { Quote } from '../infra/database/entities/quote.entity.js';
import { Contract } from '../infra/database/entities/contract.entity.js';
import { Review } from '../infra/database/entities/review.entity.js';

const BCRYPT_ROUNDS = 12;
const SEED_PASSWORD = '12345678';
const CLIENT_POOL_SIZE = 40;
const INSERT_CHUNK_SIZE = 100;

interface CategoryDef {
  slug: string;
  name: string;
}

const CATEGORIES: CategoryDef[] = [
  { slug: 'eletricista', name: 'Eletricista' },
  { slug: 'encanador', name: 'Encanador' },
  { slug: 'pintor', name: 'Pintor (Residencial e Predial)' },
  { slug: 'diarista-e-limpeza', name: 'Diarista e Limpeza' },
  { slug: 'jardinagem', name: 'Jardinagem e Poda de Árvores' },
  { slug: 'marcenaria-e-reforma', name: 'Marcenaria e Reforma' },
  { slug: 'aulas-particulares', name: 'Aulas Particulares' },
  { slug: 'beleza-e-estetica', name: 'Beleza e Estética' },
  { slug: 'suporte-em-tecnologia', name: 'Suporte em Tecnologia' },
  { slug: 'transporte-e-frete', name: 'Transporte, Frete e Remoção de Entulho' },
  { slug: 'personal-trainer', name: 'Personal Trainer' },
  { slug: 'fotografia', name: 'Fotografia' },
  { slug: 'veterinario-a-domicilio', name: 'Veterinário a Domicílio' },
  { slug: 'costura-e-ajustes', name: 'Costura e Ajustes' },
  { slug: 'chaveiro', name: 'Chaveiro' },
  { slug: 'dedetizacao', name: 'Dedetização e Controle de Pragas' },
  { slug: 'ar-condicionado', name: 'Instalação e Manutenção de Ar-Condicionado e Refrigeração' },
  { slug: 'vidracaria', name: 'Vidraçaria' },
  { slug: 'gesso-e-drywall', name: 'Gesso e Drywall' },
  { slug: 'seguranca-e-portaria', name: 'Segurança e Portaria' },
  { slug: 'cuidador-de-idosos', name: 'Cuidador de Idosos' },
  { slug: 'baba', name: 'Babá' },
  { slug: 'confeitaria', name: 'Confeitaria' },
  { slug: 'som-e-eventos', name: 'DJ e Som para Eventos' },
  { slug: 'contabilidade', name: 'Contabilidade' },
  { slug: 'pedreiro', name: 'Pedreiro e Construção Civil' },
  { slug: 'montador-de-moveis', name: 'Montador de Móveis' },
  { slug: 'serralheiro', name: 'Serralheiro e Soldador (Portões e Grades)' },
  { slug: 'marmorista', name: 'Marmorista e Granito' },
  { slug: 'impermeabilizacao', name: 'Impermeabilização' },
  { slug: 'piso-e-porcelanato', name: 'Instalação de Piso e Porcelanato' },
  { slug: 'pocos-e-cisternas', name: 'Poços Artesianos e Cisternas' },
  { slug: 'reparo-eletrodomesticos', name: 'Reparo de Eletrodomésticos' },
  { slug: 'antenista', name: 'Antenista e Instalação de TV' },
  { slug: 'energia-solar', name: 'Instalação de Painel Solar' },
  { slug: 'piscineiro', name: 'Piscineiro' },
  { slug: 'tapeceiro', name: 'Tapeceiro e Estofador' },
  { slug: 'sapateiro', name: 'Sapateiro' },
  { slug: 'marido-de-aluguel', name: 'Marido de Aluguel (Pequenos Reparos)' },
  { slug: 'afiacao-de-ferramentas', name: 'Afiação de Ferramentas e Facas' },
  { slug: 'guincho-e-reboque', name: 'Guincho e Reboque' },
];

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro',
  'Rafaela', 'Sérgio', 'Tatiane', 'Vinícius', 'Aline', 'Bruna', 'Caio', 'Débora',
  'Emerson', 'Fernanda', 'Guilherme', 'Helena', 'Igor', 'Juliana', 'Kevin', 'Larissa',
  'Marcelo', 'Natália', 'Otávio', 'Patrícia', 'Rodrigo', 'Sabrina', 'Thiago', 'Vanessa',
  'Alexandre', 'Beatriz', 'Cláudio', 'Diana', 'Ewerton', 'Flávia', 'Gustavo', 'Heloísa',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Monteiro', 'Cardoso',
  'Reis', 'Araújo', 'Correia', 'Teixeira', 'Nunes', 'Machado',
];

const CITIES: { city: string; state: string }[] = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Campinas', state: 'SP' },
  { city: 'Santos', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Niterói', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Uberlândia', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Londrina', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Caxias do Sul', state: 'RS' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Recife', state: 'PE' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Brasília', state: 'DF' },
  { city: 'Goiânia', state: 'GO' },
  { city: 'Florianópolis', state: 'SC' },
  { city: 'Joinville', state: 'SC' },
  { city: 'Vitória', state: 'ES' },
  { city: 'Manaus', state: 'AM' },
];

const HEADLINE_TEMPLATES: Record<string, string[]> = {
  eletricista: [
    'Eletricista residencial e predial',
    'Instalações elétricas com segurança e garantia',
    'Especialista em quadros de energia e fiação',
    'Eletricista para emergências 24h',
  ],
  encanador: [
    'Encanador especialista em vazamentos',
    'Instalação e manutenção hidráulica',
    'Desentupimento e reparos hidráulicos',
    'Encanador para obras e reformas',
  ],
  pintor: [
    'Pintor residencial e comercial',
    'Pintura interna e externa com acabamento fino',
    'Especialista em textura e grafiato',
    'Pintor com material próprio incluso',
  ],
  'diarista-e-limpeza': [
    'Diarista com referências e pontualidade',
    'Limpeza residencial completa',
    'Limpeza pós-obra e faxina pesada',
    'Serviços de limpeza para escritórios',
  ],
  jardinagem: [
    'Jardineiro para poda e manutenção de jardins',
    'Paisagismo e cuidado de plantas',
    'Manutenção de jardins e áreas verdes',
    'Especialista em grama e irrigação',
  ],
  'marcenaria-e-reforma': [
    'Marceneiro sob medida para móveis planejados',
    'Reformas residenciais completas',
    'Montagem e reparo de móveis',
    'Pequenos reparos e reformas gerais',
  ],
  'aulas-particulares': [
    'Professor particular de matemática e física',
    'Aulas de reforço escolar para todas as idades',
    'Professor de inglês conversação e gramática',
    'Aulas de música e teoria musical',
  ],
  'beleza-e-estetica': [
    'Cabeleireira e especialista em coloração',
    'Manicure e pedicure a domicílio',
    'Esteticista facial e corporal',
    'Maquiadora para eventos e casamentos',
  ],
  'suporte-em-tecnologia': [
    'Suporte técnico em informática a domicílio',
    'Formatação, manutenção e redes',
    'Especialista em redes Wi-Fi e câmeras',
    'Montagem e manutenção de computadores',
  ],
  'transporte-e-frete': [
    'Frete e mudanças residenciais',
    'Transporte de móveis com equipe própria',
    'Motorista para pequenas mudanças',
    'Carreto e entregas rápidas',
  ],
  'personal-trainer': [
    'Personal trainer para treinos em casa ou ao ar livre',
    'Treinamento funcional personalizado',
    'Acompanhamento físico com foco em resultado',
    'Personal trainer para todas as idades',
  ],
  fotografia: [
    'Fotógrafo para eventos e ensaios',
    'Cobertura fotográfica de casamentos e festas',
    'Ensaios fotográficos profissionais',
    'Fotografia de produtos e retratos',
  ],
  'veterinario-a-domicilio': [
    'Veterinário para consultas a domicílio',
    'Atendimento veterinário emergencial',
    'Cuidados veterinários para cães e gatos',
    'Vacinação e check-up a domicílio',
  ],
  'costura-e-ajustes': [
    'Costureira para ajustes e reparos',
    'Confecção sob medida',
    'Ajustes de roupas em geral',
    'Costura e conserto de tecidos',
  ],
  chaveiro: [
    'Chaveiro 24 horas',
    'Abertura de portas e cópia de chaves',
    'Troca de fechaduras residenciais',
    'Chaveiro para emergências automotivas',
  ],
  dedetizacao: [
    'Dedetização e controle de pragas',
    'Combate a baratas, cupins e ratos',
    'Desinfecção residencial e comercial',
    'Controle de pragas com produtos seguros',
  ],
  'ar-condicionado': [
    'Instalação de ar-condicionado split',
    'Manutenção e limpeza de ar-condicionado',
    'Reparo e recarga de gás refrigerante',
    'Instalação e manutenção para residências e empresas',
  ],
  vidracaria: [
    'Vidraceiro para box e janelas',
    'Instalação de espelhos e vidros temperados',
    'Reparo de vidros quebrados',
    'Fechamento de varandas com vidro',
  ],
  'gesso-e-drywall': [
    'Instalação de forro de gesso e drywall',
    'Sanca e rebaixamento de teto',
    'Paredes em drywall para reformas',
    'Acabamento em gesso liso',
  ],
  'seguranca-e-portaria': [
    'Porteiro e vigia para condomínios',
    'Segurança para eventos',
    'Vigilância residencial e comercial',
    'Controle de acesso e portaria',
  ],
  'cuidador-de-idosos': [
    'Cuidador de idosos com experiência',
    'Acompanhante para idosos em casa',
    'Cuidados especializados e humanizados',
    'Cuidador para período diurno ou noturno',
  ],
  baba: [
    'Babá com experiência e referências',
    'Cuidado infantil em período integral',
    'Babá para eventos e período noturno',
    'Acompanhamento escolar e cuidados diários',
  ],
  confeitaria: [
    'Confeiteira para bolos e doces personalizados',
    'Doces para festas e eventos',
    'Bolo decorado sob encomenda',
    'Confeitaria artesanal',
  ],
  'som-e-eventos': [
    'DJ para festas e eventos',
    'Som e iluminação para casamentos',
    'Equipamento de som completo para eventos',
    'DJ e animação para festas',
  ],
  contabilidade: [
    'Contador para pequenas empresas e MEI',
    'Serviços contábeis e fiscais',
    'Abertura e regularização de empresas',
    'Consultoria contábil personalizada',
  ],
};

const BIO_TEMPLATES: Record<string, string[]> = {
  eletricista: [
    'Atuo há anos com instalações elétricas residenciais e comerciais, sempre seguindo as normas de segurança.',
    'Realizo desde trocas simples de tomadas até instalação completa de quadros de distribuição.',
    'Atendimento rápido para emergências elétricas, com orçamento sem compromisso.',
  ],
  encanador: [
    'Especializado em identificar e resolver vazamentos com rapidez, evitando maiores prejuízos.',
    'Trabalho com instalação de caixas d’água, registros, torneiras e reparos em geral.',
    'Atendo residências e comércios com agilidade e garantia no serviço.',
  ],
  pintor: [
    'Cuido de todo o processo, desde a preparação da parede até o acabamento final.',
    'Trabalho com tintas de qualidade e prazos combinados com o cliente.',
    'Experiência em pintura de fachadas, interiores e texturas decorativas.',
  ],
  'diarista-e-limpeza': [
    'Ofereço limpeza completa e organização, com atenção aos detalhes.',
    'Atendo residências fixas ou avulsas, sempre com pontualidade e discrição.',
    'Trabalho com produtos de limpeza próprios ou fornecidos pelo cliente.',
  ],
  jardinagem: [
    'Cuido de podas, plantio e manutenção geral de jardins pequenos e grandes.',
    'Experiência com paisagismo e montagem de jardins do zero.',
    'Atendimento mensal ou avulso conforme a necessidade do cliente.',
  ],
  'marcenaria-e-reforma': [
    'Faço móveis sob medida e pequenos reparos com precisão e qualidade.',
    'Atendo reformas completas, do projeto à entrega final.',
    'Trabalho com madeira maciça e MDF, sempre com acabamento caprichado.',
  ],
  'aulas-particulares': [
    'Ajudo alunos de todas as idades a superar dificuldades com aulas didáticas.',
    'Metodologia personalizada de acordo com o ritmo de cada aluno.',
    'Aulas presenciais ou online, com material de apoio incluso.',
  ],
  'beleza-e-estetica': [
    'Atendimento a domicílio ou em espaço próprio, com produtos de qualidade.',
    'Especializada em procedimentos que valorizam a beleza natural.',
    'Atendo para o dia a dia e também para eventos especiais.',
  ],
  'suporte-em-tecnologia': [
    'Resolvo problemas de computador, internet e redes com rapidez.',
    'Atendimento presencial ou remoto conforme a necessidade.',
    'Experiência com formatação, manutenção preventiva e configuração de redes.',
  ],
  'transporte-e-frete': [
    'Conto com veículo próprio e equipe para ajudar no carregamento.',
    'Atendo mudanças pequenas e médias com cuidado no manuseio dos itens.',
    'Frete rápido para entregas e pequenos transportes.',
  ],
  'personal-trainer': [
    'Monto treinos personalizados de acordo com o objetivo de cada aluno.',
    'Atendo em domicílio, parques ou academias, com foco em resultado seguro.',
    'Acompanhamento constante da evolução física do aluno.',
  ],
  fotografia: [
    'Registro momentos especiais com um olhar profissional e sensível.',
    'Atendo casamentos, aniversários, ensaios e eventos corporativos.',
    'Entrego as fotos editadas em prazo combinado com o cliente.',
  ],
  'veterinario-a-domicilio': [
    'Atendo cães e gatos no conforto de casa, reduzindo o estresse do pet.',
    'Realizo consultas, vacinação e pequenos procedimentos a domicílio.',
    'Acompanhamento próximo da saúde do animal, com retorno rápido.',
  ],
  'costura-e-ajustes': [
    'Faço ajustes, bainhas e pequenos reparos com prazo rápido.',
    'Trabalho com costura sob medida e reformas de roupas.',
    'Atendimento cuidadoso, sempre respeitando o caimento da peça.',
  ],
  chaveiro: [
    'Atendimento rápido para emergências de chaves e fechaduras.',
    'Faço cópias de chaves comuns e codificadas.',
    'Troco fechaduras e resolvo travas de portas e portões.',
  ],
  dedetizacao: [
    'Utilizo produtos seguros para pessoas e animais domésticos.',
    'Atendo residências, comércios e condomínios.',
    'Ofereço garantia no serviço de controle de pragas.',
  ],
  'ar-condicionado': [
    'Instalo e faço manutenção preventiva em aparelhos split e janela.',
    'Realizo limpeza completa para melhorar a eficiência do ar-condicionado.',
    'Atendo residências e empresas com agilidade.',
  ],
  vidracaria: [
    'Trabalho com vidros temperados, box e espelhos sob medida.',
    'Faço reparo e substituição de vidros quebrados com rapidez.',
    'Atendo fechamento de varandas e sacadas em vidro.',
  ],
  'gesso-e-drywall': [
    'Executo forros, sancas e paredes em drywall com acabamento fino.',
    'Trabalho com rebaixamento de teto e iluminação embutida.',
    'Atendo reformas completas em gesso e drywall.',
  ],
  'seguranca-e-portaria': [
    'Experiência em portaria de condomínios e controle de acesso.',
    'Atendo eventos e comércios com postura profissional.',
    'Disponibilidade para plantões diurnos e noturnos.',
  ],
  'cuidador-de-idosos': [
    'Cuido com atenção e carinho, respeitando a rotina do idoso.',
    'Experiência com mobilidade reduzida e acompanhamento de medicação.',
    'Disponibilidade para período integral ou plantões.',
  ],
  baba: [
    'Cuido de crianças com atenção, paciência e responsabilidade.',
    'Auxilio em tarefas escolares e rotina diária.',
    'Disponibilidade para período integral, noturno ou eventos.',
  ],
  confeitaria: [
    'Faço bolos, doces e salgados personalizados para qualquer ocasião.',
    'Trabalho com receitas próprias e ingredientes selecionados.',
    'Atendo encomendas para festas, aniversários e casamentos.',
  ],
  'som-e-eventos': [
    'Ofereço equipamento completo de som e iluminação para festas.',
    'Toco em casamentos, aniversários e eventos corporativos.',
    'Monto playlists personalizadas de acordo com o estilo do evento.',
  ],
  contabilidade: [
    'Atendo pequenas empresas e autônomos com serviços contábeis completos.',
    'Auxilio na abertura, regularização e encerramento de empresas.',
    'Ofereço consultoria tributária personalizada para cada negócio.',
  ],
};

const REVIEW_COMMENTS: Record<'positive' | 'neutral' | 'negative', string[]> = {
  positive: [
    'Excelente profissional, super recomendo! Pontual e caprichoso no serviço.',
    'Serviço impecável, resolveu tudo rapidinho. Vou chamar de novo com certeza.',
    'Muito educado e prestativo, entregou o serviço antes do prazo combinado.',
    'Trabalho de altíssima qualidade, superou minhas expectativas.',
    'Profissional muito atencioso, explicou tudo que estava fazendo. Recomendo!',
  ],
  neutral: [
    'Serviço ficou bom, mas atrasou um pouco para chegar.',
    'Cumpriu o combinado, sem problemas maiores.',
    'Fez o serviço certinho, poderia caprichar um pouco mais no acabamento.',
  ],
  negative: [
    'Demorou mais do que o combinado, mas o resultado final foi razoável.',
    'Tive que pedir para refazer uma parte do serviço.',
  ],
};

function pick<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index] as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fullName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function weightedRating(): number {
  const roll = Math.random();
  if (roll < 0.4) return 5;
  if (roll < 0.75) return 4;
  if (roll < 0.9) return 3;
  if (roll < 0.97) return 2;
  return 1;
}

function commentForRating(rating: number): string {
  if (rating >= 4) return pick(REVIEW_COMMENTS.positive);
  if (rating === 3) return pick(REVIEW_COMMENTS.neutral);
  return pick(REVIEW_COMMENTS.negative);
}

function uniquePhone(sequence: number): string {
  const ddd = 11 + (sequence % 79);
  const suffix = String(100000000 + sequence).slice(-9);
  return `+55${ddd}9${suffix}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function bulkInsert<T extends ObjectLiteral>(repository: Repository<T>, rows: T[]): Promise<void> {
  for (const batch of chunk(rows, INSERT_CHUNK_SIZE)) {
    if (batch.length === 0) continue;
    await repository.insert(batch);
  }
}

interface SeededProfessional {
  userId: string;
  profileId: string;
  categorySlug: string;
}

async function main(): Promise<void> {
  const totalRequested = Number(process.argv[2] ?? '200');
  if (!Number.isFinite(totalRequested) || totalRequested <= 0) {
    throw new Error('usage: seed-professionals.ts [totalProfessionals]');
  }
  const professionalsPerCategory = Math.ceil(totalRequested / CATEGORIES.length);

  await AppDataSource.initialize();

  const categoryRepo = AppDataSource.getRepository(ServiceCategory);
  const userRepo = AppDataSource.getRepository(User);
  const profileRepo = AppDataSource.getRepository(ProfessionalProfile);
  const profCategoryRepo = AppDataSource.getRepository(ProfessionalCategory);
  const serviceAreaRepo = AppDataSource.getRepository(ProfessionalServiceArea);
  const demandRepo = AppDataSource.getRepository(ServiceDemand);
  const quoteRepo = AppDataSource.getRepository(Quote);
  const contractRepo = AppDataSource.getRepository(Contract);
  const reviewRepo = AppDataSource.getRepository(Review);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  const categoryIdBySlug: Record<string, string> = {};
  for (const category of CATEGORIES) {
    const existing = await categoryRepo.findOne({ where: { slug: category.slug } });
    if (existing) {
      categoryIdBySlug[category.slug] = existing.id;
      continue;
    }
    const id = randomUUID();
    await categoryRepo.insert({
      id,
      parent_id: null,
      name: category.name,
      slug: category.slug,
      icon: null,
      description: `Profissionais de ${category.name.toLowerCase()}`,
      is_active: true,
    });
    categoryIdBySlug[category.slug] = id;
  }

  const existingClients = await userRepo.find({ where: { email: Like('cliente.seed%') } });
  const clientIds = existingClients.map((row) => row.id);

  if (existingClients.length < CLIENT_POOL_SIZE) {
    const newClientRows: User[] = [];
    for (let i = existingClients.length; i < CLIENT_POOL_SIZE; i++) {
      const client = userRepo.create({
        id: randomUUID(),
        email: `cliente.seed${i}@example.com`,
        phone: uniquePhone(i),
        password_hash: passwordHash,
        role: 'client',
        full_name: fullName(),
        cpf: null,
        avatar_url: null,
        status: 'active',
        email_verified_at: new Date(),
        phone_verified_at: null,
      });
      newClientRows.push(client);
      clientIds.push(client.id);
    }
    await bulkInsert(userRepo, newClientRows);
  }

  const existingProfessionalCount = await userRepo.count({ where: { email: Like('profissional.seed%') } });

  const professionalUserRows: User[] = [];
  const profileRows: ProfessionalProfile[] = [];
  const profCategoryRows: ProfessionalCategory[] = [];
  const serviceAreaRows: ProfessionalServiceArea[] = [];
  const seededProfessionals: SeededProfessional[] = [];

  let sequence = existingProfessionalCount;
  for (const category of CATEGORIES) {
    for (let i = 0; i < professionalsPerCategory; i++) {
      const userId = randomUUID();
      const profileId = randomUUID();
      const location = pick(CITIES);

      professionalUserRows.push(
        userRepo.create({
          id: userId,
          email: `profissional.seed${sequence}@example.com`,
          phone: uniquePhone(CLIENT_POOL_SIZE + sequence),
          password_hash: passwordHash,
          role: 'professional',
          full_name: fullName(),
          cpf: null,
          avatar_url: null,
          status: 'active',
          email_verified_at: new Date(),
          phone_verified_at: null,
        }),
      );

      profileRows.push(
        profileRepo.create({
          id: profileId,
          user_id: userId,
          headline: pick(HEADLINE_TEMPLATES[category.slug] as string[]),
          bio: pick(BIO_TEMPLATES[category.slug] as string[]),
          years_experience: randomInt(1, 20),
          hourly_rate: String(randomInt(40, 180)),
          service_radius_km: randomInt(5, 50),
          rating_average: '0.00',
          rating_count: 0,
          is_available: Math.random() > 0.15,
          verified_at: Math.random() > 0.3 ? new Date() : null,
        }),
      );

      profCategoryRows.push(
        profCategoryRepo.create({
          id: randomUUID(),
          professional_id: profileId,
          category_id: categoryIdBySlug[category.slug] as string,
        }),
      );

      serviceAreaRows.push(
        serviceAreaRepo.create({
          id: randomUUID(),
          professional_id: profileId,
          city: location.city,
          state: location.state,
          radius_km: randomInt(5, 50),
        }),
      );

      seededProfessionals.push({ userId, profileId, categorySlug: category.slug });
      sequence++;
    }
  }

  await bulkInsert(userRepo, professionalUserRows);
  await bulkInsert(profileRepo, profileRows);
  await bulkInsert(profCategoryRepo, profCategoryRows);
  await bulkInsert(serviceAreaRepo, serviceAreaRows);

  const demandRows: ServiceDemand[] = [];
  const quoteRows: Quote[] = [];
  const contractRows: Contract[] = [];
  const reviewRows: Review[] = [];
  const ratingsByProfile = new Map<string, number[]>();

  for (const professional of seededProfessionals) {
    const reviewCount = randomInt(1, 5);
    const ratings: number[] = [];

    for (let r = 0; r < reviewCount; r++) {
      const demandId = randomUUID();
      const quoteId = randomUUID();
      const contractId = randomUUID();
      const clientId = pick(clientIds);
      const amount = (randomInt(80, 500) + Math.random()).toFixed(2);
      const completedDaysAgo = randomInt(1, 9);
      const startedDaysAgo = completedDaysAgo + randomInt(1, 20);
      const demandLocation = pick(CITIES);

      demandRows.push(
        demandRepo.create({
          id: demandId,
          client_id: clientId,
          category_id: categoryIdBySlug[professional.categorySlug] as string,
          street: 'Rua Principal',
          number: String(randomInt(1, 999)),
          complement: null,
          district: 'Centro',
          city: demandLocation.city,
          state: demandLocation.state,
          zip_code: '00000-000',
          title: pick(HEADLINE_TEMPLATES[professional.categorySlug] as string[]),
          description: `Preciso de um profissional de ${professional.categorySlug.replace(/-/g, ' ')} para um serviço.`,
          budget_min: null,
          budget_max: null,
          status: 'closed',
          preferred_date: null,
        }),
      );

      quoteRows.push(
        quoteRepo.create({
          id: quoteId,
          demand_id: demandId,
          professional_id: professional.profileId,
          message: null,
          total_amount: amount,
          estimated_days: randomInt(1, 10),
          status: 'accepted',
          valid_until: null,
        }),
      );

      contractRows.push(
        contractRepo.create({
          id: contractId,
          demand_id: demandId,
          quote_id: quoteId,
          client_id: clientId,
          professional_id: professional.profileId,
          total_amount: amount,
          status: 'completed',
          started_at: new Date(Date.now() - startedDaysAgo * 86400000),
          completed_at: new Date(Date.now() - completedDaysAgo * 86400000),
          cancelled_at: null,
          cancelled_by: null,
          cancellation_reason: null,
        }),
      );

      const rating = weightedRating();
      ratings.push(rating);

      reviewRows.push(
        reviewRepo.create({
          id: randomUUID(),
          contract_id: contractId,
          reviewer_id: clientId,
          reviewee_id: professional.userId,
          rating,
          comment: commentForRating(rating),
          response: null,
        }),
      );
    }

    ratingsByProfile.set(professional.profileId, ratings);
  }

  await bulkInsert(demandRepo, demandRows);
  await bulkInsert(quoteRepo, quoteRows);
  await bulkInsert(contractRepo, contractRows);
  await bulkInsert(reviewRepo, reviewRows);

  for (const professional of seededProfessionals) {
    const ratings = ratingsByProfile.get(professional.profileId) ?? [];
    if (ratings.length === 0) continue;
    const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    await profileRepo.update(
      { id: professional.profileId },
      { rating_average: average.toFixed(2), rating_count: ratings.length },
    );
  }

  process.stdout.write(
    JSON.stringify({
      categories: CATEGORIES.length,
      clients: clientIds.length,
      professionals: professionalUserRows.length,
      reviews: reviewRows.length,
    }),
  );

  await AppDataSource.destroy();
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exitCode = 1;
});
