const { EmbedBuilder, ApplicationCommandOptionType, SelectMenuBuilder, ActionRowBuilder } = require("discord.js");

function isLessonInInterval(lesson, from, to) {
    return lesson.from >= from && lesson.from <= to;
}


module.exports = {
    data: {
        description: "Vous fournis l'emploi du temps de la journée",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "date",
                description: "Sélectionnez la date du cours",
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

        await client.session.timetable(date).then((cours) => {
            let totalDuration = 0;

            let embedCours = cours.map((cour) => {
                // Ne pas afficher les cours si jamais ils sont annulés et qu'ils sont remplacés par un autre cours dont les horaires sont inclus par un autre cours
                if (cour.isCancelled && cours.find((c) => isLessonInInterval(c, cour.from, cour.to) && !c.isCancelled)) {
                    return;
                }
                totalDuration += cour.to.getTime() - cour.from.getTime();

                const subHomeworks = client.cache.homeworks.filter(h => h.subject === cour.subject && cour.from.getDate()+"/"+cour.from.getMonth() === h.for.getDate()+"/"+h.for.getMonth());
                const coursIsAway = cour.isAway || cour.isCancelled || cour.status?.match(/(.+)?prof(.+)?absent(.+)?/giu) || cour.status == "Cours annulé";
                const embed = new EmbedBuilder()
                    .setColor(cour.color ?? "#70C7A4")
                    .setAuthor({
                        name: cour.subject ?? (cour.status ?? "Non défini"),
                    })
                    .setDescription("Professeur: **" + (cour.teacher ?? "*Non précisé*") + "**" +
                        "\nSalle: `" + (cour.room ?? " ? ") + "`" +
                        "\nDe **" + cour.from.toLocaleTimeString().split(":")[0] +
                        "h" + cour.from.toLocaleTimeString().split(":")[1] + "**" +
                        " à **" + cour.to.toLocaleTimeString().split(":")[0] +
                        "h" + cour.to.toLocaleTimeString().split(":")[1] + "**" +
                        " *(" + (cour.to.getTime() - cour.from.getTime()) / 1000 / 60 / 60 + "h)*" +
                        (subHomeworks.length && !coursIsAway ? `\n⚠**__\`${subHomeworks.length}\` Devoirs__**` : "") +
                        (coursIsAway ? "\n🚫__**Cour annulé**__" : ""));
                    
                if (cour.status && (!coursIsAway || cour.statut !== "Cours annulé")) {
                    embed.addFields([
                        {
                            name: "Status",
                            value: "__**" + cour.status + "**__"
                        }
                    ]);
                }
                return embed;
            }).filter(emb => !!emb);
            
            if (embedCours.length >= 9) {
                const embed = new EmbedBuilder()
                    .setColor("#70C7A4")
                    .addFields(
                        embedCours.map((emb) => {
                            return {
                                name: emb.author.name,
                                value: emb.description,
                                inline: false
                            };
                        })
                    );
                embedCours = [embed];
            }

            totalDuration = Math.abs(totalDuration / 1000 / 60 / 60);
            const embed = new EmbedBuilder()
                .setColor("#70C7A4")
                .setTitle("Vous avez " + embedCours.length + " cours "+ ( dateUser ? `le \`${dateUser}\`` : "aujourd'hui") +" :")
                .setDescription("Durée totale : **" + totalDuration + "h**");

            const current = new Date(date.getTime());
            const week = [];
            for (let i = 1; i <= 7; i++) {
                let first = current.getDate() - current.getDay() + i;
                let day = new Date(current.setDate(first));
                if (day.getDay() !== 0) week.push(day);
            }
            let weekString = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

            const selectMenu = new SelectMenuBuilder()
                .setCustomId("cours_date")
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

            return interaction.editReply({ embeds: [embed].concat(embedCours.filter(emb => !!emb)), components: [new ActionRowBuilder().addComponents(selectMenu)] });
        });
    },
};