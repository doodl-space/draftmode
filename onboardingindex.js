require('dotenv').config({ path: '.onboarding.env' });
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // Required to receive DMs
});

const VERIFIED_ROLE_NAME = "Verified Member";

// Send DM on join
client.on('guildMemberAdd', async (member) => {
  try {
    await member.send(
      `👋 Welcome to the server, ${member.user.username}!\n\nPlease reply to this DM with your invite code to verify and unlock the community.`
    );
    console.log(`📨 Sent DM to ${member.user.tag}`);
  } catch (err) {
    console.error(`❌ Could not DM ${member.user.tag}:`, err.message);
  }
});

// Handle DM replies
client.on('messageCreate', async (message) => {
  if (message.channel.type !== 1 || message.author.bot) return; // DM only

  const inviteCode = message.content.trim();
  const discordId = message.author.id;

  // Inform user we're checking
  await message.channel.send("🔍 Checking your invite code...");

  try {
    const response = await axios.post(process.env.WEBHOOK_URL, {
      discord_id: discordId,
      invite_code: inviteCode,
    });

    const { status } = response.data;

    if (status === "valid") {
      // Find member in server
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(discordId);
      const role = guild.roles.cache.find(r => r.name === VERIFIED_ROLE_NAME);

      if (!role) {
        return await message.channel.send("❌ Verified Member role not found. Please contact admin.");
      }

      await member.roles.add(role);
      await message.channel.send("✅ You're verified and now have access to the community. Welcome aboard!");
      console.log(`✅ Verified: ${member.user.tag}`);
    } else {
      await message.channel.send("❌ That invite code is invalid. Please check and try again.");
    }
  } catch (err) {
    console.error("❌ Error verifying code:", err.message);
    await message.channel.send("❌ Something went wrong while verifying. Please try again later.");
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
