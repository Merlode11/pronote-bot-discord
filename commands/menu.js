const { EmbedBuilder, ApplicationCommandOptionType, SelectMenuBuilder, ActionRowBuilder } = require("discord.js");

module.exports = {
    data: {
        description: "Vous fournis le menu d'aujourd'hui",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "date",
                description: "Sélectionnez la date du menu souhaité",
                required: false,
                autocomplete: true
            }
        ],
    },
    execute: async (client, interaction) => {
        const dateUser = interaction.options.getString("date");
        let date = new Date();
        if (dateUser) {
            let parsed = dateUser.split("/");
            date = new Date(parseInt(parsed[2]), parseInt(parsed[1]) - 1, parseInt(parsed[0]));
        }

        await client.session.menu(date).then(async (menus) => {
            const menu = menus[0];

            const embed = new EmbedBuilder()
                .setTitle("Menu du jour")
                .setColor("#70C7A4");
            if (menu) embed
                .setDescription(`Menu du ${menu.date}`)
                .setTimestamp(new Date(menu.date))
                .addFields(menu.meals[0].map((meal) => {
                    meal = meal[0];
                    return {
                        name: meal.name,
                        value: meal.labels.map((label) => {
                            return `• ${label}`;
                        }).join("\n") || "\u200b",
                        inline: false
                    };
                }));
            else embed.setDescription("Aucun menu n'a été trouvé pour aujourd'hui");

            const warnEmbed = new EmbedBuilder()
                .setTitle("Attention")
                .setDescription("Cette commande est en cours de développement. Comme le développeur ne possède pas les menus sur son pronote, il ne peut pas tester correctement cette commande. Si vous rencontrez des problèmes ou que vous voulez aider, merci de contacter le développeur sur github.")
                .setColor("#FFA500");

            const current = new Date(date.getTime());
            const week = [];
            for (let i = 1; i <= 7; i++) {
                let first = current.getDate() - current.getDay() + i;
                let day = new Date(current.setDate(first));
                if (day.getDay() !== 0) week.push(day);
            }
            let weekString = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

            const selectMenu = new SelectMenuBuilder()
                .setCustomId("menus_date")
                .setPlaceholder("Sélectionnez une date pour voir les cours")
                .addOptions(week.map((day) => {
                    return {
                        label: day.toLocaleDateString(),
                        value: day.toLocaleDateString(),
                        description: weekString[day.getDay()] + " " + day.toLocaleDateString().split("/")[0],
                        default: day.toLocaleDateString() === date.toLocaleDateString()
                    };
                }))
                .setMaxValues(1)
                .setMinValues(1);


            return await interaction.editReply({
                embeds: [embed, warnEmbed],
                components: [new ActionRowBuilder().addComponents(selectMenu), client.bugActionRow]
            });
        });

    },
};