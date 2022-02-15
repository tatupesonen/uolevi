import * as core from '@actions/core'
import * as github from '@actions/github'
import { subDays } from "date-fns";
import format from 'date-fns/format';

async function run(): Promise<void> {
  try {
    const days: string = core.getInput('days');
		const token: string = core.getInput('token')
		const numDays = parseInt(days);

		const context = github.context;
		const octoKit = github.getOctokit(token);

		const now = Date.now();
		const past = subDays(now, numDays);
		
		const commits = await octoKit.rest.repos.listCommits({
			...context.repo,
		})

		// Filter to commits in past numDays days
		const rows = commits.data.filter(e => new Date(e.commit!.author!.date!) > past).map(e => e.commit.message);

		const tableStart = 
		`
		|   |   |
		|---|---|
		`

		const table = `${tableStart}\n${rows.map(e => `| ${e} |`).join("\n")}`;
		await octoKit.rest.issues.create({
			...context.repo,
			title: format(now, "dd-MM-yyyy"),
			body: `Commits between ${format(past, "dd-MM-yyyy")} - ${format(now, "dd-MM-yyyy")}:\n${table}`,
			labels: [{name: "Kooste"}]
		})	

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
