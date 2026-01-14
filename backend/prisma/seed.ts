import { PrismaClient, UserRole, NotificationType, LoopStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const GENRES = [
  'Hip Hop',
  'Trap',
  'R&B',
  'Pop',
  'Electronic',
  'House',
  'Techno',
  'Lo-Fi',
  'Jazz',
  'Ambient',
];

const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em', 'Gm'];

const TAGS = [
  'drums',
  'bass',
  'synth',
  'piano',
  'guitar',
  'vocals',
  'fx',
  'pad',
  'lead',
  'arp',
  'melody',
  'chords',
  'percussion',
  '808',
  'hihat',
  'kick',
  'snare',
  'clap',
  'atmospheric',
  'dark',
  'bright',
  'chill',
  'energetic',
  'groovy',
  'minimal',
];

const LOOP_TITLES = [
  'Midnight Groove',
  'Summer Vibes',
  'Dark Matter',
  'Golden Hour',
  'Neon Dreams',
  'Urban Jungle',
  'Ocean Waves',
  'Electric Soul',
  'Velvet Touch',
  'Crystal Clear',
  'Shadow Dance',
  'Fire Starter',
  'Ice Cold',
  'Warm Embrace',
  'Wild Hearts',
  'Silent Storm',
  'Cosmic Journey',
  'Street Beat',
  'Soul Kitchen',
  'Night Rider',
  'Day Tripper',
  'Moon Walker',
  'Star Gazer',
  'Dream Catcher',
  'Wave Runner',
  'Cloud Nine',
  'Thunder Roll',
  'Smooth Operator',
  'Heavy Hitter',
  'Light Touch',
  'Deep Dive',
  'High Rise',
  'Low Rider',
  'Fast Lane',
  'Slow Motion',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomBpm(): number {
  return Math.floor(Math.random() * 100) + 80; // 80-180 BPM
}

function randomDuration(): number {
  return Math.floor(Math.random() * 20) + 5; // 5-25 seconds
}

function generateWaveformData(): number[] {
  const length = 100;
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    data.push(Math.random() * 0.8 + 0.1);
  }
  return data;
}

function generateHash(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.listen.deleteMany();
  await prisma.download.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.loopTag.deleteMany();
  await prisma.loop.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create tags
  console.log('🏷️  Creating tags...');
  const tags = await Promise.all(
    TAGS.map((name) =>
      prisma.tag.create({
        data: { name },
      })
    )
  );
  console.log(`   Created ${tags.length} tags`);

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@beatthat.com',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      bio: 'BeatThat administrator and curator.',
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'beatmaker',
        email: 'beatmaker@example.com',
        passwordHash: hashedPassword,
        bio: 'Professional beat maker. I create loops for the community.',
      },
    }),
    prisma.user.create({
      data: {
        username: 'producer808',
        email: 'producer808@example.com',
        passwordHash: hashedPassword,
        bio: 'Trap and hip hop producer. Sharing my sounds.',
      },
    }),
    prisma.user.create({
      data: {
        username: 'synthwave_master',
        email: 'synthwave@example.com',
        passwordHash: hashedPassword,
        bio: 'Electronic music enthusiast. Love synths and pads.',
      },
    }),
    prisma.user.create({
      data: {
        username: 'lofi_vibes',
        email: 'lofi@example.com',
        passwordHash: hashedPassword,
        bio: 'Chill beats for studying and relaxing.',
      },
    }),
    prisma.user.create({
      data: {
        username: 'drums_n_bass',
        email: 'dnb@example.com',
        passwordHash: hashedPassword,
        bio: 'DnB producer sharing drum loops and basslines.',
      },
    }),
  ]);

  const allUsers = [admin, ...users];
  console.log(`   Created ${allUsers.length} users`);

  // Create loops
  console.log('🎵 Creating loops...');
  const loops = [];
  
  // Helper to generate slug
  const generateSlug = (title: string, index: number): string => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return `${baseSlug}-${index}`;
  };
  
  for (let i = 0; i < LOOP_TITLES.length; i++) {
    const title = LOOP_TITLES[i];
    const user = randomItem(allUsers);
    const loopTags = randomItems(tags, Math.floor(Math.random() * 5) + 1);

    const loop = await prisma.loop.create({
      data: {
        title,
        slug: generateSlug(title, i + 1),
        description: `${title} - A high quality ${randomItem(GENRES).toLowerCase()} loop ready for your next production.`,
        bpm: randomBpm(),
        key: randomItem(KEYS),
        duration: randomDuration(),
        genre: randomItem(GENRES),
        originalFile: `loop_${i + 1}.wav`,
        previewFile: `loop_${i + 1}_preview.mp3`,
        fileHash: generateHash(),
        waveformData: generateWaveformData(),
        status: LoopStatus.READY,
        userId: user.id,
      },
    });

    // Create loop-tag relations
    for (const tag of loopTags) {
      await prisma.loopTag.create({
        data: {
          loopId: loop.id,
          tagId: tag.id,
        },
      });
    }

    loops.push(loop);
  }
  console.log(`   Created ${loops.length} loops`);

  // Create ratings
  console.log('⭐ Creating ratings...');
  let ratingCount = 0;
  for (const loop of loops) {
    const raters = randomItems(allUsers, Math.floor(Math.random() * 4) + 1);
    for (const rater of raters) {
      if (rater.id !== loop.userId) {
        await prisma.rating.create({
          data: {
            value: Math.floor(Math.random() * 3) + 3, // 3-5 stars
            userId: rater.id,
            loopId: loop.id,
          },
        });
        ratingCount++;
      }
    }
  }
  console.log(`   Created ${ratingCount} ratings`);

  // Update average ratings
  console.log('📊 Updating average ratings...');
  for (const loop of loops) {
    const ratings = await prisma.rating.findMany({
      where: { loopId: loop.id },
    });
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
      await prisma.loop.update({
        where: { id: loop.id },
        data: { 
          averageRating: avg,
          ratingCount: ratings.length,
        },
      });
    }
  }

  // Create favorites
  console.log('❤️  Creating favorites...');
  let favoriteCount = 0;
  for (const user of allUsers) {
    const favLoops = randomItems(loops, Math.floor(Math.random() * 8) + 2);
    for (const loop of favLoops) {
      if (loop.userId !== user.id) {
        await prisma.favorite.create({
          data: {
            userId: user.id,
            loopId: loop.id,
          },
        });
        favoriteCount++;
      }
    }
  }
  console.log(`   Created ${favoriteCount} favorites`);

  // Update favorite counts on loops
  for (const loop of loops) {
    const count = await prisma.favorite.count({ where: { loopId: loop.id } });
    await prisma.loop.update({
      where: { id: loop.id },
      data: { favoriteCount: count },
    });
  }

  // Create downloads
  console.log('📥 Creating downloads...');
  let downloadCount = 0;
  for (const loop of loops) {
    const downloaders = randomItems(allUsers, Math.floor(Math.random() * 10) + 5);
    for (const downloader of downloaders) {
      await prisma.download.create({
        data: {
          userId: downloader.id,
          loopId: loop.id,
          certificateHash: generateHash(),
        },
      });
      downloadCount++;
    }
    
    // Update download count on loop
    await prisma.loop.update({
      where: { id: loop.id },
      data: { downloadCount: downloaders.length },
    });
  }
  console.log(`   Created ${downloadCount} downloads`);

  // Create listens
  console.log('👂 Creating listens...');
  let listenCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const loop of loops) {
    const listeners = randomItems(allUsers, Math.floor(Math.random() * 20) + 10);
    const uniqueListeners = new Set<string>();
    
    for (const listener of listeners) {
      if (!uniqueListeners.has(listener.id)) {
        await prisma.listen.create({
          data: {
            userId: listener.id,
            loopId: loop.id,
            listenDate: today,
          },
        });
        uniqueListeners.add(listener.id);
        listenCount++;
      }
    }
    
    // Update listen count on loop
    await prisma.loop.update({
      where: { id: loop.id },
      data: { listenCount: uniqueListeners.size },
    });
  }
  console.log(`   Created ${listenCount} listens`);

  // Create comments
  console.log('💬 Creating comments...');
  const commentTexts = [
    'Great loop! Using this in my next track.',
    'Fire! 🔥',
    'This is exactly what I was looking for.',
    'Clean and crisp. Nice work!',
    'The groove on this is insane.',
    'Perfect for my project. Thanks!',
    'Love the vibe on this one.',
    'Quality stuff right here.',
    'This slaps hard!',
    'Bookmarking this for later.',
  ];
  
  let commentCount = 0;
  for (const loop of loops) {
    const commenters = randomItems(allUsers, Math.floor(Math.random() * 3) + 1);
    for (const commenter of commenters) {
      await prisma.comment.create({
        data: {
          content: randomItem(commentTexts),
          userId: commenter.id,
          loopId: loop.id,
        },
      });
      commentCount++;
    }
  }
  console.log(`   Created ${commentCount} comments`);

  // Create some chat messages
  console.log('📨 Creating chat messages...');
  const chatMessages = [
    { from: users[0], content: 'Hey everyone! Love this platform!' },
    { from: users[1], content: 'Check out my latest upload.' },
    { from: users[2], content: 'Any tips for getting featured?' },
    { from: admin, content: 'Keep uploading quality loops and engage with the community!' },
    { from: users[3], content: 'Just dropped some lo-fi beats!' },
    { from: users[4], content: 'Anyone up for a collab?' },
  ];
  
  for (const msg of chatMessages) {
    await prisma.chatMessage.create({
      data: {
        content: msg.content,
        userId: msg.from.id,
        roomId: 'general',
      },
    });
  }
  console.log(`   Created ${chatMessages.length} chat messages`);

  // Create notifications
  console.log('🔔 Creating notifications...');
  for (const user of users) {
    await prisma.notification.create({
      data: {
        type: NotificationType.SYSTEM,
        title: 'Welcome to BeatThat!',
        message: 'Start exploring and sharing beats with the community.',
        userId: user.id,
      },
    });
  }
  console.log(`   Created ${users.length} notifications`);

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   - ${allUsers.length} users (including 1 admin)`);
  console.log(`   - ${tags.length} tags`);
  console.log(`   - ${loops.length} loops`);
  console.log(`   - ${ratingCount} ratings`);
  console.log(`   - ${favoriteCount} favorites`);
  console.log(`   - ${downloadCount} downloads`);
  console.log(`   - ${listenCount} listens`);
  console.log(`   - ${commentCount} comments`);
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('   Admin: admin@beatthat.com / password123');
  console.log('   User:  beatmaker@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
