import * as core from '@actions/core'
import * as github from '@actions/github'
import {subDays} from 'date-fns'
import format from 'date-fns/format'

async function run(): Promise<void> {
  try {
    const days: string = core.getInput('days')
    const token: string = core.getInput('token')
    const branch: string = core.getInput('branch')
    const numDays = parseInt(days)

    const context = github.context
    const octoKit = github.getOctokit(token)

    const now = Date.now()
    const past = subDays(now, numDays)

    const commits = await octoKit.rest.repos.listCommits({
      ...context.repo,
      sha: branch
    })

		// thank you sindresorhus
		// https://github.com/sindresorhus/issue-regex/blob/main/index.js
		const issueRegex = /(?:(?<![/\w-.])\w[\w-.]+?\/\w[\w-.]+?|\B)#[1-9]\d*?\b/g;

    // Filter to commits in past numDays days
    const rows = commits.data
      .filter(e => new Date(e.commit!.author!.date!) > past)
      .map(e => {
        const {message} = e.commit
				const issue = message.match(issueRegex);
				const issueNum = issue ? issue[0] : "No issue";
        const [firstLine] = message.split('\n')
        if (firstLine.length > 70) return `(${issueNum}) ` + firstLine.slice(0, 70) + ' ...'
        return `(${issueNum}) ` + firstLine
      })

    const tableStart = '| Commit message |\n|---|'
    const tableRows = rows.map(e => `| ${e} |`)
    const tableContent = tableRows.join('\n')
    const table = `${tableStart}\n${tableContent}`
    await octoKit.rest.issues.create({
      ...context.repo,
      title: format(now, 'dd-MM-yyyy'),
      body: `Commits between ${format(past, 'dd-MM-yyyy')} - ${format(
        now,
        'dd-MM-yyyy'
      )}:\n${table}`,
      labels: [{name: 'Kooste'}]
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
