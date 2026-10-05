import {
  testElasticsearch,
  syncEmailsToElasticsearch,
} from "./elasticsearch";

async function main() {
  await testElasticsearch();
  await syncEmailsToElasticsearch();
}

main();